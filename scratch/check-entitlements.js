const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from("entitlements").select("episode_unlocked").limit(1);
  if (error) {
    console.error("Error fetching episode_unlocked column:", error.message);
  } else {
    console.log("Success! episode_unlocked exists. Data:", data);
  }
}

checkTable();
