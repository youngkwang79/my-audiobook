const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const workId = "Myeolsaguirim Chomuyeong";
  
  // 에피소드 컬럼 확인
  const { data: eps, error: eErr } = await supabase
    .from("episodes")
    .select("*")
    .eq("work_id", workId)
    .limit(3);

  console.log("Episodes:", JSON.stringify(eps, null, 2));
  if (eErr) console.error("Error:", eErr);
}

run().catch(console.error);
