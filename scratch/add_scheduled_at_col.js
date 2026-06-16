const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Running execute_sql RPC to add scheduled_at column to works...");
  const { data, error } = await supabase.rpc("execute_sql", {
    query: "ALTER TABLE public.works ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE NULL;"
  });

  if (error) {
    console.error("Failed:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

run().catch(console.error);
