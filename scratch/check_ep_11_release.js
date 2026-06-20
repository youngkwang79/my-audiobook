const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const workId = "gupailbangcheonjaedeulmumyengs";
  const { data, error } = await supabase
    .from("episodes")
    .select("id, work_id, title, locked, release_date")
    .eq("work_id", workId)
    .eq("id", "11")
    .maybeSingle();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Episode 11 details:", data);
    console.log("Current system time:", new Date().toISOString());
  }
}

run().catch(console.error);
