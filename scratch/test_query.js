const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testIds = ["Myeolsaguirim Chomuyeong", "Myeolsaguirim%20Chomuyeong"];
  for (const id of testIds) {
    console.log(`Testing eq("id", "${id}"):`);
    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("  Error:", error);
    } else {
      console.log("  Success! Found title:", data ? data.title : "null");
    }
  }
}

run().catch(console.error);
