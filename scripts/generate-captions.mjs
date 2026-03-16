// scripts/generate-captions.mjs
// 사용 예:
// node scripts/generate-captions.mjs
// node scripts/generate-captions.mjs --from=10
// node scripts/generate-captions.mjs --from=10 --to=20
// node scripts/generate-captions.mjs --from=10 --concurrency=6
// node scripts/generate-captions.mjs --episodes=10,11,12
// node scripts/generate-captions.mjs --episodes=10,11,12 --concurrency=8

const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

// 에피소드별 파트 수
const EPISODE_TOTAL_PARTS = {
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
  "26": 23,
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
};

const DEFAULT_CONCURRENCY = 6;
const RETRY = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = {
    from: null,
    to: null,
    episodes: null,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (const raw of argv) {
    if (raw.startsWith("--from=")) {
      args.from = raw.split("=")[1];
      continue;
    }

    if (raw.startsWith("--to=")) {
      args.to = raw.split("=")[1];
      continue;
    }

    if (raw.startsWith("--episodes=")) {
      args.episodes = raw
        .split("=")[1]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      continue;
    }

    if (raw.startsWith("--concurrency=")) {
      const value = Number(raw.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        args.concurrency = Math.floor(value);
      }
      continue;
    }
  }

  return args;
}

function getEpisodeList(args) {
  const allEpisodes = Object.keys(EPISODE_TOTAL_PARTS);

  if (args.episodes?.length) {
    return allEpisodes.filter((ep) => args.episodes.includes(ep));
  }

  const numericEpisodes = allEpisodes
    .filter((ep) => /^\d+$/.test(ep))
    .map((ep) => Number(ep))
    .sort((a, b) => a - b);

  let from = args.from ? Number(args.from) : null;
  let to = args.to ? Number(args.to) : null;

  if (from !== null && !Number.isFinite(from)) from = null;
  if (to !== null && !Number.isFinite(to)) to = null;

  const filteredNumeric = numericEpisodes.filter((ep) => {
    if (from !== null && ep < from) return false;
    if (to !== null && ep > to) return false;
    return true;
  });

  const numericSet = new Set(filteredNumeric.map(String));

  // 숫자 화만 범위 필터 적용
  // "32-1" 같은 특수 화는 from/to 범위에 32가 포함되면 같이 넣어줌
  const specialEpisodes = allEpisodes.filter((ep) => {
    if (/^\d+$/.test(ep)) return false;
    const m = ep.match(/^(\d+)-/);
    if (!m) return false;
    return numericSet.has(m[1]);
  });

  const result = [...filteredNumeric.map(String), ...specialEpisodes];

  return result.sort((a, b) => {
    const aMatch = a.match(/^(\d+)(?:-(.*))?$/);
    const bMatch = b.match(/^(\d+)(?:-(.*))?$/);

    if (!aMatch || !bMatch) return a.localeCompare(b, "ko");

    const aNum = Number(aMatch[1]);
    const bNum = Number(bMatch[1]);

    if (aNum !== bNum) return aNum - bNum;

    const aSuffix = aMatch[2] ?? "";
    const bSuffix = bMatch[2] ?? "";
    return aSuffix.localeCompare(bSuffix, "ko");
  });
}

function buildJobs(episodes) {
  const jobs = [];

  for (const ep of episodes) {
    const total = EPISODE_TOTAL_PARTS[ep];
    for (let part = 1; part <= total; part++) {
      jobs.push({ episode: ep, part });
    }
  }

  return jobs;
}

async function callWorker(episode, part) {
  const url = `${WORKER_BASE}/?episode=${encodeURIComponent(
    episode
  )}&part=${encodeURIComponent(String(part))}`;

  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      console.log(`✅ OK  ep=${episode} part=${part}  ${text}`);
      return { ok: true, episode, part };
    } catch (e) {
      const isLast = attempt === RETRY;
      console.log(
        `⚠️ FAIL ep=${episode} part=${part} attempt=${attempt + 1}/${RETRY + 1} :: ${
          e.message
        }`
      );

      if (isLast) {
        return { ok: false, episode, part, error: e.message };
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  return { ok: false, episode, part, error: "unknown_error" };
}

async function runPool(jobs, concurrency) {
  const results = [];
  let index = 0;

  async function workerLoop(workerId) {
    while (true) {
      const currentIndex = index;
      index += 1;

      if (currentIndex >= jobs.length) {
        return;
      }

      const job = jobs[currentIndex];
      console.log(
        `🚀 [worker ${workerId}] 시작 ep=${job.episode} part=${job.part} (${currentIndex + 1}/${jobs.length})`
      );

      const result = await callWorker(job.episode, job.part);
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) =>
    workerLoop(i + 1)
  );

  await Promise.all(workers);

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const episodes = getEpisodeList(args);

  if (!episodes.length) {
    console.log("조건에 맞는 에피소드가 없습니다.");
    process.exit(0);
  }

  const jobs = buildJobs(episodes);

  console.log(`대상 에피소드: ${episodes.join(", ")}`);
  console.log(`총 에피소드 수: ${episodes.length}`);
  console.log(`총 작업 수(파트 수): ${jobs.length}`);
  console.log(`병렬 처리 수: ${args.concurrency}`);
  console.log("");

  const startedAt = Date.now();
  const results = await runPool(jobs, args.concurrency);
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  const okResults = results.filter((r) => r?.ok);
  const failResults = results.filter((r) => r && !r.ok);

  console.log(`\n🎉 완료!`);
  console.log(`- 성공: ${okResults.length}`);
  console.log(`- 실패: ${failResults.length}`);
  console.log(`- 소요 시간: ${elapsedSec}초`);

  if (failResults.length > 0) {
    console.log("\n실패 목록:");
    for (const fail of failResults) {
      console.log(`- ep=${fail.episode} part=${fail.part} :: ${fail.error}`);
    }

    const retryEpisodes = failResults
      .map((f) => f.episode)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    console.log("\n실패한 것만 다시 돌릴 때 참고:");
    console.log(
      `node scripts/generate-captions.mjs --episodes=${retryEpisodes.join(",")}`
    );
  }
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});