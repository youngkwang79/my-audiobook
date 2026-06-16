const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorks() {
  const { data, error } = await supabase.from("works").select("*");
  if (error) {
    console.error("Error fetching works:", error.message);
  } else {
    console.log("All works in DB:");
    data.forEach(w => {
      console.log(`ID: ${w.id} | Title: ${w.title} | Status: ${w.status} | Thumbnail: ${w.thumbnail_url}`);
    });
  }
}

checkWorks();
