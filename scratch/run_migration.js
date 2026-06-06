const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function patchDatabase() {
  console.log("Attempting to run execute_sql RPC to add is_hidden column to community_posts...");
  const { data, error } = await supabase.rpc("execute_sql", {
    query: "ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;"
  });
  
  if (error) {
    console.error("RPC execute_sql failed:", error);
  } else {
    console.log("RPC execute_sql success! Data:", data);
  }
}

patchDatabase();
