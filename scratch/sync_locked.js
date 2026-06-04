const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. 환생검존 현재 free_episodes 확인
  const { data: work } = await supabase
    .from("works")
    .select("id, title, free_episodes")
    .eq("id", "hwansaeng-geomjon")
    .maybeSingle();
  
  console.log("환생검존 현재 설정:", work);
  const freeUntil = work?.free_episodes ?? 3;
  console.log(`→ ${freeUntil}화까지 무료`);

  // 2. 모든 에피소드 가져오기
  const { data: eps } = await supabase
    .from("episodes")
    .select("id, locked")
    .eq("work_id", "hwansaeng-geomjon")
    .order("id");
  
  console.log(`\n총 ${eps?.length}개 에피소드`);

  // 3. locked 상태 일괄 업데이트
  const freeIds = (eps || []).filter(ep => {
    const n = parseFloat(ep.id);
    return Number.isFinite(n) && n <= freeUntil;
  }).map(ep => ep.id);

  const lockedIds = (eps || []).filter(ep => {
    const n = parseFloat(ep.id);
    return Number.isFinite(n) && n > freeUntil;
  }).map(ep => ep.id);

  console.log(`\n무료(locked=false): ${freeIds.join(", ")}`);
  console.log(`유료(locked=true): ${lockedIds.slice(0,5).join(", ")}... (총 ${lockedIds.length}개)`);

  if (freeIds.length > 0) {
    const { error: e1 } = await supabase.from("episodes").update({ locked: false }).eq("work_id", "hwansaeng-geomjon").in("id", freeIds);
    if (e1) console.error("무료 업데이트 오류:", e1);
    else console.log(`\n✅ ${freeIds.length}개 에피소드 → locked=false 완료`);
  }

  if (lockedIds.length > 0) {
    const { error: e2 } = await supabase.from("episodes").update({ locked: true }).eq("work_id", "hwansaeng-geomjon").in("id", lockedIds);
    if (e2) console.error("유료 업데이트 오류:", e2);
    else console.log(`✅ ${lockedIds.length}개 에피소드 → locked=true 완료`);
  }
}

run().catch(console.error);
