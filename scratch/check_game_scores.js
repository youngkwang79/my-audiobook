const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScores() {
  const { data: scores, error } = await supabase
    .from("game_scores")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("Error fetching scores:", error);
  } else {
    console.log("Latest game scores:");
    console.log(JSON.stringify(scores, null, 2));
  }
}

checkScores();
