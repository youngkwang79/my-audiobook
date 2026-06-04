const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("episodes")
    .update({ locked: false })
    .eq("work_id", "Myeolsaguirim Chomuyeong")
    .eq("id", "1")
    .select();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("✅ 1화 잠금 해제 완료:", data);
  }
}

run().catch(console.error);
