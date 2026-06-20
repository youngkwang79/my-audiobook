const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const workId = "gupailbangcheonjaedeulmumyengs";
  
  // Exact same query as client
  let query = supabase
    .from("episodes")
    .select("*")
    .eq("work_id", workId);

  query = query.lte("release_date", new Date().toISOString());

  const { data, error } = await query.order("id", { ascending: true });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Episodes fetched:", data.map(e => ({ id: e.id, title: e.title, locked: e.locked })));
  }
}

run().catch(console.error);
