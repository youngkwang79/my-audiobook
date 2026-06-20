const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("All subscriptions:", data);
  }
}

run().catch(console.error);
