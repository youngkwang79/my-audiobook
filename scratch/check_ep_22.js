const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const workId = "namgunguijanhonhaouibigeom";
  
  // 1. 에피소드 22 정보 조회
  const { data: ep, error: epErr } = await supabase
    .from("episodes")
    .select("*")
    .eq("work_id", workId)
    .eq("id", "22")
    .maybeSingle();

  console.log("=== EPISODE 22 ===");
  console.log(ep);
  if (epErr) console.error("Ep error:", epErr);

  // 2. 사용자의 소장권(entitlements) 확인
  const userEmail = "youngkwang7979@gmail.com";
  const { data: user, error: uErr } = await supabase.auth.admin.listUsers();
  const targetUser = user?.users?.find(u => u.email === userEmail);
  
  if (targetUser) {
    console.log(`=== USER ENTITLEMENTS FOR ${userEmail} ===`);
    const { data: ents, error: entErr } = await supabase
      .from("entitlements")
      .select("*")
      .eq("user_id", targetUser.id)
      .eq("work_id", workId);
    console.log(ents);
  }
}

run().catch(console.error);
