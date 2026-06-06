const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPosts() {
  const { data: posts, error } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching posts:", error);
  } else {
    console.log("Total posts found:", posts.length);
    console.log("Posts details:", JSON.stringify(posts, null, 2));
  }
}

checkPosts();
