const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from("works")
    .select("id, title, thumbnail")
    .ilike("title", "%웅혼%");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found works:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
