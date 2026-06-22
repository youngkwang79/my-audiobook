const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data: weeklyRaw, error: weeklyErr } = await supabase
    .from("game_scores")
    .select("user_id, username, score")
    .eq("game_id", "breath");

  if (weeklyErr) {
    console.error(weeklyErr);
  } else {
    console.log("raw data from supabase:", JSON.stringify(weeklyRaw, null, 2));
  }
}

testQuery();
