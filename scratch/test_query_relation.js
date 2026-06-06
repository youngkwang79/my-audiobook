const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelect() {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*, auth_users:user_id(email)");
  if (error) {
    console.error("SELECT Query Error:", error);
  } else {
    console.log("SELECT Query Success! Data length:", data.length);
    console.log("Sample post data:", JSON.stringify(data[0], null, 2));
  }
}

testSelect();
