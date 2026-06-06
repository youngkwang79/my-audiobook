const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function patchDatabase() {
  console.log("Checking columns on community_posts...");
  const { data: selectData, error: selectError } = await supabase.from("community_posts").select("*").limit(1);
  if (selectError) {
    console.error("Select error:", selectError);
  } else {
    const columns = selectData.length > 0 ? Object.keys(selectData[0]) : [];
    console.log("Current columns in community_posts:", columns);
    if (!columns.includes("is_hidden")) {
      console.log("is_hidden column is missing! We will add it.");
      // SQL execution via RPC or raw query if possible. If RPC execute_sql is not available, we can run a simple query.
      // Wait, is there a postgres package in this workspace? Let's check package.json.
    } else {
      console.log("is_hidden column already exists!");
    }
  }
}

patchDatabase();
