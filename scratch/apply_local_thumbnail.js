const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const localUrl = "/thumbnails/myeolsagwirim_chomuyeong.png";
  console.log(`Updating Supabase works row for "Myeolsaguirim Chomuyeong" with local path: "${localUrl}"...`);
  
  const { data, error } = await supabase
    .from("works")
    .update({ thumbnail: localUrl })
    .eq("id", "Myeolsaguirim Chomuyeong")
    .select();

  if (error) {
    console.error("Supabase update error:", error);
  } else {
    console.log("Supabase update successful!", data);
  }
}

run().catch(console.error);
