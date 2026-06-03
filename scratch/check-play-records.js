const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("site_visits")
    .select("*")
    .eq("visit_date", "2000-01-01");

  if (error) {
    console.error("DB error:", error.message);
  } else {
    console.log("Current play records (2000-01-01):", data);
  }
}

check();
