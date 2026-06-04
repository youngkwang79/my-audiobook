const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all works from Supabase...");
  const { data: works, error: worksErr } = await supabase
    .from("works")
    .select("*");

  if (worksErr) {
    console.error("Fetch works error:", worksErr);
    return;
  }
  
  console.log("Works in DB:");
  works.forEach(w => {
    console.log(`ID: "${w.id}", Title: "${w.title}", Status: "${w.status}"`);
  });

  console.log("\nFetching all episodes from Supabase...");
  const { data: episodes, error: episodesErr } = await supabase
    .from("episodes")
    .select("*");

  if (episodesErr) {
    console.error("Fetch episodes error:", episodesErr);
    return;
  }

  console.log("Episodes in DB:");
  episodes.forEach(e => {
    console.log(`ID: "${e.id}", WorkID: "${e.work_id}", Title: "${e.title}"`);
  });
}

run().catch(console.error);
