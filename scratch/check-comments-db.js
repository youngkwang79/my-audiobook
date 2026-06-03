const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking episode_comments table...");
  const { data: comments, error } = await supabase.from("episode_comments").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Comments in DB (total:", comments.length, "):");
    console.log(JSON.stringify(comments, null, 2));
  }
}

check();
