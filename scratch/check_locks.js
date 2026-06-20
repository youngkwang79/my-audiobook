const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const workId = "Woonghon_Kkaedaleumui_Geomgwa_Sonyeon";
  const { data: work } = await supabase
    .from("works")
    .select("id, title, free_episodes")
    .eq("id", workId)
    .maybeSingle();
  console.log("Work:", work);

  const { data: eps } = await supabase
    .from("episodes")
    .select("id, locked")
    .eq("work_id", workId)
    .order("id");
  console.log("Episodes lock status:", eps);
}

run().catch(console.error);
