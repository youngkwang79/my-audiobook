const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying works with episodes relation...");
  const { data, error } = await supabase
    .from("works")
    .select(`
      id,
      title,
      episodes (
        id,
        release_date
      )
    `);

  if (error) {
    console.error("Relation query error:", error);
  } else {
    console.log("Success! Data:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
