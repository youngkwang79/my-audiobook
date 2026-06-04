const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Deleting work 'myeolsagwirim' from Supabase...");
  const { data, error } = await supabase
    .from("works")
    .delete()
    .eq("id", "myeolsagwirim")
    .select();

  if (error) {
    console.error("Delete error:", error);
  } else {
    console.log("Delete successful!", data);
  }
}

run().catch(console.error);
