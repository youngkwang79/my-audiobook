// scripts/generate-captions.mjs
// 사용 예시:
// node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1 --concurrency=1
// node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-52 --concurrency=1
// node scripts/generate-captions.mjs --workId=cheonmujin --episodes=32-1,36,39 --concurrency=1
// node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-52 --concurrency=1 --force
// node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-5 --dryRun

const DEFAULT_R2_BASE =
  process.env.R2_PUBLIC_BASE_URL ||
  "https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev";

const DEFAULT_WORKER_BASE =
  process.env.CAPTION_WORKER_BASE_URL ||
  "https://transcribe-worker.uns00.workers.dev";

const DEFAULT_CONCURRENCY = 1;
const RETRY = 2;
const RETRY_WAIT_MS = 1500;
const BETWEEN_JOBS_MS = 800;

/**
 * 작품별 파트 수 정의
 * - 없는 작품은 기본 1파트로 처리
 * - 새 작품 추가 시 여기만 추가하면 됨
 */
const WORK_PARTS = {
  cheonmujin: {
    "1": 4,
    "2": 6,
    "3": 4,
    "4": 3,
    "5": 3,
    "6": 6,
    "7": 5,
    "8": 6,
    "9": 5,
    "10": 4,
    "11": 5,
    "12": 1,
    "13": 1,
    "14": 1,
    "15": 1,
    "16": 1,
    "17": 1,
    "18": 1,
    "19": 1,
    "20": 1,
    "21": 1,
    "22": 1,
    "23": 1,
    "24": 1,
    "25": 10,
    "26": 25,
    "27": 1,
    "28": 1,
    "29": 1,
    "30": 1,
    "31": 1,
    "32": 1,
    "32-1": 1,
    "33": 1,
    "34": 1,
    "35": 1,
    "36": 1,
    "37": 1,
    "38": 1,
    "39": 1,
    "40": 1,
    "41": 1,
    "42": 10,
    "43": 12,
    "44": 1,
    "45": 9,
    "46": 9,
    "47": 1,
    "48": 11,
    "49": 1,
    "50": 1,
    "51": 26,
    "52": 1,
    "53": 1,
    "54": 15,
  },

  "hwansaeng-geomjon": {
    "1": 1,
    "2": 1,
    "3": 1,
    "4": 1,
    "5": 1,
    "6": 1,
    "7": 1,
    "8": 1,
    "9": 1,
    "10": 1,
    "11": 1,
    "12": 1,
    "13": 1,
    "14": 1,
    "15": 1,
    "16": 1,
    "17": 1,
    "18": 1,
    "19": 1,
    "20": 1,
    "21": 1,
    "22": 1,
    "23": 1,
    "24": 1,
    "25": 1,
    "26": 1,
    "27": 1,
    "28": 1,
    "29": 1,
    "30": 1,
    "31": 1,
    "32": 1,
    "33": 1,
    "34": 1,
    "35": 1,
    "36": 1,
    "37": 1,
    "38": 1,
    "39": 1,
    "40": 1,
    "41": 1,
    "42": 1,
    "43": 1,
    "44": 1,
    "45": 1,
    "46": 1,
    "47": 1,
    "48": 1,
    "49": 1,
    "50": 1,
    "51": 1,
    "52": 1,
  },
};

function printUsage() {
  console.log(`사용법:
  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1 --concurrency=1
  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-52 --concurrency=1
  node scripts/generate-captions.mjs --workId=cheonmujin --episodes=32-1,36,39 --concurrency=1
  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-10 --force
  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1-5 --dryRun

옵션:
  --workId=작품ID           필수. 예: hwansaeng-geomjon
  --episodes=대상화         필수. 예: 1 / 1,2,3 / 1-10 / 32-1,36
  --concurrency=숫자        선택. 기본 1
  --force                   선택. 기존 자막(json)이 있어도 다시 생성
  --dryRun                  선택. 실제 생성 호출 없이 검사만 수행

환경변수(선택):
  R2_PUBLIC_BASE_URL        공개 R2 base URL
  CAPTION_WORKER_BASE_URL   자막 생성 worker base URL
`);
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;

    const eqIndex = raw.indexOf("=");
    if (eqIndex === -1) {
      const key = raw.slice(2);
      args[key] = true;
      continue;
    }

    const key = raw.slice(2, eqIndex);
    const value = raw.slice(eqIndex + 1);
    args[key] = value;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function isIntegerString(v) {
  return /^\d+$/.test(String(v));
}

function getEpisodeFolder(episodeKey) {
  const key = String(episodeKey);

  if (isIntegerString(key)) {
    return pad3(Number(key));
  }

  const m = key.match(/^(\d+)-(.*)$/);
  if (!m) return key;

  return `${pad3(Number(m[1]))}-${m[2]}`;
}

/**
 * episodes 파싱
 * 예:
 * 1
 * 1,2,3
 * 1-5
 * 32-1,36,39
 *
 * 규칙:
 * - "32-1" 같은 회차 ID는 그대로 인정
 * - "1-5" 는 숫자 범위로 확장
 */
function parseEpisodesInput(input) {
  if (!input || typeof input !== "string") return [];

  const items = [];
  const tokens = input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // 순수 숫자 범위만 확장
    if (/^\d+-\d+$/.test(token)) {
      const [startStr, endStr] = token.split("-");
      const start = Number(startStr);
      const end = Number(endStr);

      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
        throw new Error(`잘못된 episodes 범위: ${token}`);
      }

      for (let n = start; n <= end; n++) {
        items.push(String(n));
      }
      continue;
    }

    items.push(token);
  }

  // 중복 제거, 숫자 화는 숫자순 정렬, 나머지는 뒤에 유지
  const unique = [...new Set(items)];

  unique.sort((a, b) => {
    const aNum = /^\d+$/.test(a);
    const bNum = /^\d+$/.test(b);

    if (aNum && bNum) return Number(a) - Number(b);
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    return a.localeCompare(b, "ko");
  });

  return unique;
}

function getTotalParts(workId, episodeKey) {
  const map = WORK_PARTS[workId];
  if (!map) return 1;

  return Number(map[String(episodeKey)] ?? 1);
}

function getMp3Url(r2Base, workId, episodeKey, part) {
  const folder = getEpisodeFolder(episodeKey);
  return `${r2Base}/${workId}/${folder}/${pad2(part)}.MP3`;
}

function getCaptionJsonUrl(r2Base, workId, episodeKey, part) {
  const folder = getEpisodeFolder(episodeKey);
  return `${r2Base}/${workId}/${folder}/${pad2(part)}.json`;
}

function getWorkerUrl(workerBase, workId, episodeKey, part) {
  const url = new URL(workerBase.endsWith("/") ? workerBase : `${workerBase}/`);
  url.searchParams.set("workId", workId);
  url.searchParams.set("episode", String(episodeKey));
  url.searchParams.set("part", String(part));
  return url.toString();
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text().catch(() => "");
  return { res, text };
}

async function existsByHead(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    if (res.ok) return true;
    if (res.status === 404) return false;

    // HEAD 막혀있는 경우 GET으로 한 번 더 체크
    const fallback = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
    });

    return fallback.ok;
  } catch {
    return false;
  }
}

async function callWorker({ workerBase, workId, episodeKey, part }) {
  const url = getWorkerUrl(workerBase, workId, episodeKey, part);

  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const { res, text } = await fetchText(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      return { ok: true, text };
    } catch (error) {
      const last = attempt === RETRY;
      const message = error instanceof Error ? error.message : String(error);

      console.log(
        `⚠️ FAIL work=${workId} ep=${episodeKey} part=${part} attempt=${attempt + 1}/${RETRY + 1} :: ${message}`
      );

      if (last) {
        return { ok: false, error: message };
      }

      await sleep(RETRY_WAIT_MS);
    }
  }

  return { ok: false, error: "unknown_error" };
}

function createJobs(workId, episodeKeys) {
  const jobs = [];

  for (const episodeKey of episodeKeys) {
    const totalParts = getTotalParts(workId, episodeKey);

    for (let part = 1; part <= totalParts; part++) {
      jobs.push({
        workId,
        episodeKey: String(episodeKey),
        part,
      });
    }
  }

  return jobs;
}

async function runPool(items, limit, workerFn) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (true) {
      const current = index++;
      if (current >= items.length) return;

      results[current] = await workerFn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => runner());
  await Promise.all(workers);

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const workId = args.workId ? String(args.workId).trim() : "";
  const episodesRaw = args.episodes ? String(args.episodes).trim() : "";
  const concurrency = Math.max(
    1,
    Number.isFinite(Number(args.concurrency))
      ? Number(args.concurrency)
      : DEFAULT_CONCURRENCY
  );

  const force = Boolean(args.force);
  const dryRun = Boolean(args.dryRun);

  if (!workId || !episodesRaw) {
    printUsage();
    process.exit(1);
  }

  const r2Base = DEFAULT_R2_BASE.replace(/\/+$/, "");
  const workerBase = DEFAULT_WORKER_BASE.replace(/\/+$/, "");

  const episodeKeys = parseEpisodesInput(episodesRaw);
  const jobs = createJobs(workId, episodeKeys);

  console.log(`작품: ${workId}`);
  console.log(`대상 에피소드: ${episodeKeys.join(", ")}`);
  console.log(`총 에피소드 수: ${episodeKeys.length}`);
  console.log(`총 작업 수(파트 수): ${jobs.length}`);
  console.log(`병렬 처리 수: ${concurrency}`);
  console.log(`R2_BASE: ${r2Base}`);
  console.log(`WORKER_BASE: ${workerBase}`);
  console.log(`기존 자막 스킵: ${force ? "아니오(force 재생성)" : "예"}`);
  console.log(`드라이런: ${dryRun ? "예" : "아니오"}`);
  console.log("");

  const startedAt = Date.now();

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  const failures = [];

  await runPool(jobs, concurrency, async (job) => {
    const { workId, episodeKey, part } = job;

    const mp3Url = getMp3Url(r2Base, workId, episodeKey, part);
    const jsonUrl = getCaptionJsonUrl(r2Base, workId, episodeKey, part);

    try {
      // 1) 이미 자막이 있으면 스킵
      if (!force) {
        const hasJson = await existsByHead(jsonUrl);
        if (hasJson) {
          skippedCount++;
          console.log(`⏭️ SKIP existing caption work=${workId} ep=${episodeKey} part=${part}`);
          await sleep(BETWEEN_JOBS_MS);
          return;
        }
      }

      // 2) MP3가 실제로 있는지 확인
      const hasMp3 = await existsByHead(mp3Url);
      if (!hasMp3) {
        failCount++;
        const msg = `mp3_not_found :: ${mp3Url}`;
        failures.push(`ep=${episodeKey} part=${part} :: ${msg}`);
        console.log(`❌ FAIL work=${workId} ep=${episodeKey} part=${part} :: ${msg}`);
        await sleep(BETWEEN_JOBS_MS);
        return;
      }

      if (dryRun) {
        skippedCount++;
        console.log(`🧪 DRY-RUN work=${workId} ep=${episodeKey} part=${part} mp3=${mp3Url}`);
        await sleep(BETWEEN_JOBS_MS);
        return;
      }

      // 3) 워커 호출
      const result = await callWorker({
        workerBase,
        workId,
        episodeKey,
        part,
      });

      if (!result.ok) {
        failCount++;
        failures.push(`ep=${episodeKey} part=${part} :: ${result.error}`);
        await sleep(BETWEEN_JOBS_MS);
        return;
      }

      // 4) 생성 후 json 존재 확인
      const generated = await existsByHead(jsonUrl);
      if (!generated) {
        failCount++;
        const msg = `worker_called_but_json_missing :: ${jsonUrl}`;
        failures.push(`ep=${episodeKey} part=${part} :: ${msg}`);
        console.log(`❌ FAIL work=${workId} ep=${episodeKey} part=${part} :: ${msg}`);
        await sleep(BETWEEN_JOBS_MS);
        return;
      }

      successCount++;
      console.log(`✅ OK work=${workId} ep=${episodeKey} part=${part}`);
      await sleep(BETWEEN_JOBS_MS);
    } catch (error) {
      failCount++;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`ep=${episodeKey} part=${part} :: ${message}`);
      console.log(`❌ FAIL work=${workId} ep=${episodeKey} part=${part} :: ${message}`);
      await sleep(BETWEEN_JOBS_MS);
    }
  });

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("");
  console.log("🎉 완료!");
  console.log(`- 성공: ${successCount}`);
  console.log(`- 스킵: ${skippedCount}`);
  console.log(`- 실패: ${failCount}`);
  console.log(`- 소요 시간: ${elapsedSec}초`);

  if (failures.length > 0) {
    console.log("");
    console.log("실패 목록:");
    for (const item of failures) {
      console.log(`- ${item}`);
    }
  }

  console.log("");
  console.log("실패한 것만 다시 돌릴 때 참고:");
  console.log(
    `node scripts/generate-captions.mjs --workId=${workId} --episodes=${episodesRaw} --concurrency=${concurrency}`
  );
}

main().catch((error) => {
  console.error("치명적 오류:", error);
  process.exit(1);
});