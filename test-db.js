const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from("user_downloads").select("*").limit(1);
  if (error) {
    console.error("Table Error:", error.message);
  } else {
    console.log("Table exists! Data:", data);
  }
}

checkTable();
