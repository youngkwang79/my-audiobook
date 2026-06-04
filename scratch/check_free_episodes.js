const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 현재 멸사귀림의 free_episodes 값 확인
  const { data, error } = await supabase
    .from("works")
    .select("id, title, free_episodes, total_episodes, episode_count, status")
    .eq("id", "Myeolsaguirim Chomuyeong")
    .maybeSingle();
  
  if (error) { console.error("Error:", error); return; }
  console.log("현재 DB 값:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
