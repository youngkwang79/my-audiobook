/**
 * R2 스토리지에 있는 모든 소설의 에피소드를
 * Supabase episodes 테이블에 복원하는 스크립트
 *
 * R2 구조: {work_id}/{episode_number}/01.MP3
 * episodes 필드: id, work_id, title, locked, parts, release_date
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

// 무료 공개 에피소드 수 (소설별 앞 3화는 무료)
const FREE_EPISODE_COUNT = 3;

async function getAllR2Keys() {
  const allKeys = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1000,
      ContinuationToken: token,
    });
    const res = await s3.send(cmd);
    if (res.Contents) allKeys.push(...res.Contents.map((f) => f.Key));
    token = res.NextContinuationToken;
  } while (token);
  return allKeys;
}

async function main() {
  console.log("=== R2 episodes 전체 복원 시작 ===\n");

  // 1. R2에서 모든 MP3 파일 목록 가져오기
  console.log("📡 R2 파일 목록 조회 중...");
  const allKeys = await getAllR2Keys();
  const mp3Keys = allKeys.filter(
    (k) => k.endsWith(".MP3") || k.endsWith(".mp3")
  );
  console.log(`✅ MP3 파일 총 ${mp3Keys.length}개 발견\n`);

  // 2. work_id → episode_number → parts 구조로 파싱
  // 구조: {work_id}/{episode_number}/01.MP3 또는 {work_id}/{ep}/01.MP3 (part 번호)
  const workEpisodes = {}; // { work_id: { ep_num: parts_count } }

  for (const key of mp3Keys) {
    const parts = key.split("/");
    if (parts.length < 3) continue;

    const workId = parts[0];
    const epFolder = parts[1]; // "001", "002", ...
    const epNum = parseInt(epFolder, 10);
    if (isNaN(epNum)) continue;

    if (!workEpisodes[workId]) workEpisodes[workId] = {};
    if (!workEpisodes[workId][epNum]) workEpisodes[workId][epNum] = 0;
    workEpisodes[workId][epNum]++;
  }

  // 3. 소설별 에피소드 목록 출력
  const workIds = Object.keys(workEpisodes).sort();
  console.log("=== 복원 대상 소설 목록 ===");
  for (const wid of workIds) {
    const epCount = Object.keys(workEpisodes[wid]).length;
    console.log(`  ${wid}: ${epCount}화`);
  }
  console.log();

  // 4. episodes 테이블에 upsert
  let totalInserted = 0;
  let totalFailed = 0;

  for (const workId of workIds) {
    const epNums = Object.keys(workEpisodes[workId])
      .map(Number)
      .sort((a, b) => a - b);

    console.log(`\n📖 [${workId}] ${epNums.length}화 복원 중...`);

    const episodesToInsert = epNums.map((epNum) => {
      const parts = workEpisodes[workId][epNum];
      const isLocked = epNum > FREE_EPISODE_COUNT;

      return {
        id: String(epNum), // "1", "2", ...
        work_id: workId,
        title: `${epNum}화`,
        locked: isLocked,
        parts: parts,
        release_date: new Date("2026-01-01T00:00:00Z").toISOString(),
      };
    });

    // 배치로 upsert (50개씩)
    const BATCH = 50;
    for (let i = 0; i < episodesToInsert.length; i += BATCH) {
      const batch = episodesToInsert.slice(i, i + BATCH);
      const { error } = await supabase
        .from("episodes")
        .upsert(batch, { onConflict: "id,work_id" });

      if (error) {
        // onConflict가 안되면 그냥 insert 시도
        const { error: e2 } = await supabase.from("episodes").upsert(batch);
        if (e2) {
          console.error(`  ❌ 실패 (화 ${i+1}~${i+batch.length}):`, e2.message);
          totalFailed += batch.length;
        } else {
          console.log(`  ✅ ${batch.length}화 삽입 완료 (${i+1}~${i+batch.length}화)`);
          totalInserted += batch.length;
        }
      } else {
        console.log(`  ✅ ${batch.length}화 삽입 완료 (${i+1}~${i+batch.length}화)`);
        totalInserted += batch.length;
      }
    }

    // works 테이블 episode_count 업데이트
    await supabase
      .from("works")
      .update({
        episode_count: epNums.length,
        total_episodes: epNums.length,
        free_episodes: Math.min(FREE_EPISODE_COUNT, epNums.length),
      })
      .eq("id", workId);

    console.log(`  → works.episode_count = ${epNums.length} 업데이트됨`);
  }

  console.log(`\n=== 복원 완료! ===`);
  console.log(`✅ 총 ${totalInserted}개 에피소드 복원`);
  if (totalFailed > 0) console.log(`❌ 실패: ${totalFailed}개`);

  // 최종 확인
  const { count } = await supabase
    .from("episodes")
    .select("*", { count: "exact", head: true });
  console.log(`\n📊 현재 episodes 테이블 총 개수: ${count}개`);
}

main().catch(console.error);
