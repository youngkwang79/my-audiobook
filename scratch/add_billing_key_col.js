const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function patchDatabase() {
  console.log("Attempting to run execute_sql RPC to add billing_key column to subscriptions...");
  const { data, error } = await supabase.rpc("execute_sql", {
    query: "ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_key text;"
  });
  
  if (error) {
    console.error("RPC execute_sql failed:", error);
  } else {
    console.log("RPC execute_sql success! Data:", data);
  }
}

patchDatabase();
