const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = "e5c0c79f-478c-4acc-8742-1ab22a280958";
  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Entitlements for user:", data);
  }
}

run().catch(console.error);
