const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("works")
    .update({ title: "무명지협" })
    .eq("id", "mumyengjihyeb");

  if (error) {
    console.error("DB Update Error:", error);
  } else {
    console.log("DB Update Success!");
  }
}

run();
