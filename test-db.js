const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data: testSelect, error: selectErr } = await supabase.from("wallets").select("reward_points").limit(1);
  if (selectErr) {
    console.error("reward_points select error:", selectErr.message);
  } else {
    console.log("reward_points select success! Data:", testSelect);
  }
}

checkTable();
