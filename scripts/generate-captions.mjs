// scripts/generate-captions.mjs
// 사용 예시:
//   node scripts/generate-captions.mjs --workId=hwansaeng-geomjon
//   node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1,2,3
//   node scripts/generate-captions.mjs --workId=cheonmujin --episodes=32-1,36,39
//   node scripts/generate-captions.mjs --workId=cheonmujin --episodes=42 --concurrency=1
//
// 기본값:
// - concurrency: 1
// - sleepMs: 1200
// - retry: 2

const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

const WORK_CONFIG = {
  cheonmujin: {
    episodes: {
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
      "55": 1,
    },
  },

  // 환생검존: 각 화당 오디오 1개
  "hwansaeng-geomjon": {
    episodes: Object.fromEntries(
      Array.from({ length: 52 }, (_, i) => [String(i + 1), 1])
    ),
  },
};

function parseArgs(argv) {
  const result = {
    workId: "",
    episodes: [],
    concurrency: 1,
    sleepMs: 1200,
    retry: 2,
  };

  for (const arg of argv) {
    if (arg.startsWith("--workId=")) {
      result.workId = arg.slice("--workId=".length).trim();
      continue;
    }

    if (arg.startsWith("--episodes=")) {
      const raw = arg.slice("--episodes=".length).trim();
      result.episodes = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      const v = Number(arg.slice("--concurrency=".length).trim());
      if (Number.isFinite(v) && v > 0) result.concurrency = Math.floor(v);
      continue;
    }

    if (arg.startsWith("--sleepMs=")) {
      const v = Number(arg.slice("--sleepMs=".length).trim());
      if (Number.isFinite(v) && v >= 0) result.sleepMs = Math.floor(v);
      continue;
    }

    if (arg.startsWith("--retry=")) {
      const v = Number(arg.slice("--retry=".length).trim());
      if (Number.isFinite(v) && v >= 0) result.retry = Math.floor(v);
      continue;
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTargetEpisodes(workId, requestedEpisodes) {
  const work = WORK_CONFIG[workId];
  if (!work) return [];

  const allEpisodes = Object.keys(work.episodes);

  if (!requestedEpisodes.length) {
    return allEpisodes;
  }

  return requestedEpisodes.filter((ep) => {
    if (!(ep in work.episodes)) {
      console.log(`⚠️ 경고: ${workId}에 없는 에피소드라 건너뜀 -> ${ep}`);
      return false;
    }
    return true;
  });
}

async function callWorker({ workId, episode, part, retry }) {
  const url =
    `${WORKER_BASE}/?workId=${encodeURIComponent(workId)}` +
    `&episode=${encodeURIComponent(episode)}` +
    `&part=${encodeURIComponent(String(part))}`;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      console.log(`✅ OK work=${workId} ep=${episode} part=${part} ${text}`);
      return { ok: true, episode, part };
    } catch (e) {
      const isLast = attempt === retry;
      console.log(
        `⚠️ FAIL work=${workId} ep=${episode} part=${part} attempt=${attempt + 1}/${retry + 1} :: ${e.message}`
      );

      if (isLast) {
        return {
          ok: false,
          episode,
          part,
          error: e.message,
        };
      }

      await sleep(1500);
    }
  }

  return {
    ok: false,
    episode,
    part,
    error: "unknown_error",
  };
}

async function runWithConcurrency(tasks, concurrency, handler, sleepMs) {
  let index = 0;
  let active = 0;
  const results = [];

  return await new Promise((resolve) => {
    const launchNext = () => {
      if (index >= tasks.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < concurrency && index < tasks.length) {
        const task = tasks[index++];
        active++;

        (async () => {
          try {
            const result = await handler(task);
            results.push(result);
          } finally {
            active--;
            if (sleepMs > 0) {
              await sleep(sleepMs);
            }
            launchNext();
          }
        })();
      }
    };

    launchNext();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.workId) {
    console.log("사용법:");
    console.log("  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon");
    console.log("  node scripts/generate-captions.mjs --workId=cheonmujin --episodes=32-1,36,39");
    console.log("  node scripts/generate-captions.mjs --workId=hwansaeng-geomjon --episodes=1 --concurrency=1");
    process.exit(1);
  }

  const work = WORK_CONFIG[args.workId];
  if (!work) {
    console.log(`알 수 없는 workId: ${args.workId}`);
    console.log(`가능한 값: ${Object.keys(WORK_CONFIG).join(", ")}`);
    process.exit(1);
  }

  const targetEpisodes = getTargetEpisodes(args.workId, args.episodes);
  if (!targetEpisodes.length) {
    console.log("실행할 에피소드가 없습니다.");
    process.exit(0);
  }

  const tasks = [];
  for (const ep of targetEpisodes) {
    const totalParts = work.episodes[ep];
    for (let part = 1; part <= totalParts; part++) {
      tasks.push({ episode: ep, part });
    }
  }

  console.log(`작품: ${args.workId}`);
  console.log(`대상 에피소드: ${targetEpisodes.join(", ")}`);
  console.log(`총 에피소드 수: ${targetEpisodes.length}`);
  console.log(`총 작업 수(파트 수): ${tasks.length}`);
  console.log(`병렬 처리 수: ${args.concurrency}`);

  const startedAt = Date.now();

  const results = await runWithConcurrency(
    tasks,
    args.concurrency,
    async ({ episode, part }, i) => {
      return await callWorker({
        workId: args.workId,
        episode,
        part,
        retry: args.retry,
      });
    },
    args.sleepMs
  );

  const okList = results.filter((r) => r.ok);
  const failList = results.filter((r) => !r.ok);

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("\n🎉 완료!");
  console.log(`- 성공: ${okList.length}`);
  console.log(`- 실패: ${failList.length}`);
  console.log(`- 소요 시간: ${elapsedSec}초`);

  if (failList.length > 0) {
    console.log("\n실패 목록:");
    for (const item of failList) {
      console.log(`- ep=${item.episode} part=${item.part} :: ${item.error}`);
    }

    const failedEpisodes = [...new Set(failList.map((v) => v.episode))];
    console.log("\n실패한 것만 다시 돌릴 때 참고:");
    console.log(
      `node scripts/generate-captions.mjs --workId=${args.workId} --episodes=${failedEpisodes.join(",")} --concurrency=1`
    );
  }
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});