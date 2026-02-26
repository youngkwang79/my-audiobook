// scripts/generate-captions.mjs
// 실행: node scripts/generate-captions.mjs

const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

// ✅ 에피소드별 파트 수 (사용자 제공 그대로)
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
  "54": 15
};

// ✅ 너무 빠르게 때리면 제한 걸릴 수 있어서 1~2초 쉬어가기
const SLEEP_MS = 1200;

// ✅ 실패했을 때 재시도 횟수
const RETRY = 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callWorker(episode, part) {
  const url = `${WORKER_BASE}/?episode=${encodeURIComponent(episode)}&part=${encodeURIComponent(String(part))}`;

  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      // 성공 로그
      console.log(`✅ OK  ep=${episode} part=${part}  ${text}`);
      return true;
    } catch (e) {
      const isLast = attempt === RETRY;
      console.log(`⚠️ FAIL ep=${episode} part=${part} attempt=${attempt + 1}/${RETRY + 1} :: ${e.message}`);
      if (isLast) return false;
      await sleep(1500);
    }
  }
  return false;
}

async function main() {
  const episodes = Object.keys(EPISODE_TOTAL_PARTS);

  console.log(`총 에피소드 수: ${episodes.length}`);
  let okCount = 0;
  let failCount = 0;

  for (const ep of episodes) {
    const total = EPISODE_TOTAL_PARTS[ep];
    console.log(`\n==== 에피소드 ${ep} (총 ${total}편) ====`);
    for (let p = 1; p <= total; p++) {
      const ok = await callWorker(ep, p);
      if (ok) okCount++;
      else failCount++;

      await sleep(SLEEP_MS);
    }
  }

  console.log(`\n🎉 완료! 성공: ${okCount}, 실패: ${failCount}`);
  if (failCount > 0) {
    console.log("실패가 있으면, 로그에 뜬 ep/part 조합만 다시 돌리면 됩니다.");
  }
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
