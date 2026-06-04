const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying episode details...");
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("work_id", "Myeolsaguirim Chomuyeong");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Episodes:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
