const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = "e5c0c79f-478c-4acc-8742-1ab22a280958";
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("Admin API Error:", error);
  } else {
    console.log("Auth User Email:", user?.email);
    console.log("Auth User metadata:", user?.user_metadata);
    console.log("Auth App metadata:", user?.app_metadata);
  }
}

run().catch(console.error);
