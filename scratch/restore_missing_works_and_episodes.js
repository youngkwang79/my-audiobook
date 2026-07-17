/**
 * 1단계: works 테이블에 누락된 12개 소설 등록
 * 2단계: episodes 재삽입
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2 = "https://r2.murimbook.com";
const DEFAULT_THUMB = R2 + "/thumbnails/cheonmujin.png";

// ── 누락된 12개 소설 정의 ──────────────────────────────
const MISSING_WORKS = [
  {
    id: "cheonmujin",
    title: "천무진",
    thumbnail: R2 + "/thumbnails/cheonmujin.png",
    subtitle: "[정통무협] [절대고수]",
    status: "연재중",
  },
  {
    id: "mugyengpungunrog",
    title: "묵영풍운록",
    thumbnail: R2 + "/thumbnails/mugyengpungunrog_1781684384164.png",
    subtitle: "[정통무협] [성장]",
    status: "연재중",
  },
  {
    id: "yajangsingeom",
    title: "야장신검(夜葬神劍)",
    thumbnail: R2 + "/thumbnails/yajangsingeom_1781671858468.png",
    subtitle: "[복수극] [기연]",
    status: "완결",
  },
  {
    id: "gaebanguibonghwangmaengeulbaro",
    title: "개방의 봉황 맹을 바로 세우다",
    thumbnail: R2 + "/thumbnails/gaebanguibonghwangmaengeulbaro_1781396522035.png",
    subtitle: "[정통무협] [개방]",
    status: "완결",
  },
  {
    id: "pisbichjeolmaegeoleobuteungang",
    title: "피빛 절맥 - 얼어붙은 강호를 깨다",
    thumbnail: R2 + "/thumbnails/pisbichjeolmaegeoleobuteungang_1782005034165.png",
    subtitle: "[복수극] [절맥]",
    status: "완결",
  },
  {
    id: "cheongunjeonjeoldaejauigagseon",
    title: "청운전 - 절대자의 각성",
    thumbnail: R2 + "/thumbnails/cheongunjeonjeoldaejauigagseon_1782332375481.jpeg",
    subtitle: "[환생물] [각성]",
    status: "완결",
  },
  {
    id: "mangeomchonggwibureojingeomeur",
    title: "만검총귀 부러진 검을",
    thumbnail: R2 + "/thumbnails/mangeomchonggwibureojingeomeur_1782770989426.jpeg",
    subtitle: "[무협] [성장]",
    status: "완결",
  },
  {
    id: "musanggeomheuteojingeomuippuri",
    title: "무상검 흐트러진 검의 뿌리",
    thumbnail: R2 + "/thumbnails/musanggeomheuteojingeomuippuri_1781863121412.jpeg",
    subtitle: "[무협] [검법]",
    status: "완결",
  },
  {
    id: "mageomuihyeltong",
    title: "마검의 혈통",
    thumbnail: DEFAULT_THUMB,
    subtitle: "[무협] [마도]",
    status: "완결",
  },
  {
    id: "mumyengjihyeb",
    title: "무명지협",
    thumbnail: DEFAULT_THUMB,
    subtitle: "[무협] [협객]",
    status: "완결",
  },
  {
    id: "mumyengmuhyebsoseol",
    title: "무명 무협소설",
    thumbnail: DEFAULT_THUMB,
    subtitle: "[무협]",
    status: "완결",
  },
  {
    id: "bubugongdongmyenguiapateujongb",
    title: "부부공동명의 아파트 종부세",
    thumbnail: R2 + "/thumbnails/bubugongdongmyenguiapateujongb_1783412616169.jpg",
    subtitle: "[오디오 칼럼]",
    status: "공개",
  },
];

const FREE_EP = 3;

async function getAllR2Keys() {
  const all = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, MaxKeys: 1000, ContinuationToken: token }));
    if (res.Contents) all.push(...res.Contents.map((f) => f.Key));
    token = res.NextContinuationToken;
  } while (token);
  return all;
}

async function main() {
  // ── 1단계: works 등록 ──
  console.log("=== [STEP 1] 누락 소설 works 등록 ===\n");
  for (const w of MISSING_WORKS) {
    const { error } = await supabase.from("works").upsert([{
      id: w.id,
      title: w.title,
      thumbnail: w.thumbnail,
      subtitle: w.subtitle,
      status: w.status,
      badge: "NEW",
      description: w.title + " - 무림북 오디오북",
      episode_count: 0,
      total_episodes: 50,
      free_episodes: FREE_EP,
      exclusive: true,
      featured: true,
      views: 0,
      play_count: 0,
      is_membership_only: false,
      last_voice: null,
      last_pitch: null,
      last_rate: null,
      created_at: "2026-06-01T00:00:00+00:00",
    }]);
    if (error) console.log("  ❌ " + w.id + ":", error.message);
    else console.log("  ✅ works 등록: " + w.title + " (" + w.id + ")");
  }

  // ── 2단계: R2에서 에피소드 재삽입 ──
  console.log("\n=== [STEP 2] 에피소드 삽입 ===\n");
  const allKeys = await getAllR2Keys();
  const mp3Keys = allKeys.filter(k => k.endsWith(".MP3") || k.endsWith(".mp3"));

  // work_id → { epNum: parts }
  const workEps = {};
  for (const key of mp3Keys) {
    const parts = key.split("/");
    if (parts.length < 3) continue;
    const wid = parts[0];
    const epNum = parseInt(parts[1], 10);
    if (isNaN(epNum)) continue;
    if (!workEps[wid]) workEps[wid] = {};
    workEps[wid][epNum] = (workEps[wid][epNum] || 0) + 1;
  }

  const targetIds = MISSING_WORKS.map(w => w.id);
  let totalOk = 0, totalFail = 0;

  for (const wid of targetIds) {
    if (!workEps[wid]) { console.log("⚠️  " + wid + ": R2에 에피소드 없음"); continue; }
    const epNums = Object.keys(workEps[wid]).map(Number).sort((a,b)=>a-b);
    console.log("📖 [" + wid + "] " + epNums.length + "화 삽입 중...");

    const rows = epNums.map(n => ({
      id: String(n),
      work_id: wid,
      title: n + "화",
      locked: n > FREE_EP,
      parts: workEps[wid][n],
      release_date: new Date("2026-01-01T00:00:00Z").toISOString(),
    }));

    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("episodes").upsert(batch);
      if (error) {
        console.log("  ❌ 실패 (" + (i+1) + "~" + Math.min(i+BATCH, rows.length) + "화):", error.message);
        totalFail += batch.length;
      } else {
        console.log("  ✅ " + batch.length + "화 삽입 (" + (i+1) + "~" + Math.min(i+BATCH, rows.length) + "화)");
        totalOk += batch.length;
      }
    }

    // works episode_count 업데이트
    await supabase.from("works").update({
      episode_count: epNums.length,
      total_episodes: epNums.length,
      free_episodes: Math.min(FREE_EP, epNums.length),
    }).eq("id", wid);
    console.log("  → episode_count = " + epNums.length + " 업데이트");
  }

  // ── 최종 현황 ──
  const { count: epTotal } = await supabase.from("episodes").select("*", { count: "exact", head: true });
  const { count: workTotal } = await supabase.from("works").select("*", { count: "exact", head: true });

  console.log("\n=== 최종 현황 ===");
  console.log("✅ 이번 에피소드 삽입: " + totalOk + "개 성공, " + totalFail + "개 실패");
  console.log("📊 episodes 테이블 총: " + epTotal + "개");
  console.log("📚 works 테이블 총: " + workTotal + "개");
}

main().catch(console.error);
