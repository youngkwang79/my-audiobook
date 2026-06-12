const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying work details...");
  const { data, error } = await supabase
    .from("works")
    .select("id, title, thumbnail");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Works details:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
