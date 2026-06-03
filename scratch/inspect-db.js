const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.rpc("inspect_schema");
  if (error) {
    console.log("RPC inspect_schema not found, trying query via sql client or reading pg tables directly.");
    const { data: tables, error: tableErr } = await supabase
      .from("pg_catalog.pg_tables")
      .select("tablename")
      .eq("schemaname", "public");
    
    if (tableErr) {
      // Let's try selecting from information_schema if available via a query
      console.log("Could not select pg_tables directly:", tableErr.message);
      
      // Let's try standard tables we know to see if they exist
      const knownTables = ["wallets", "entitlements", "subscriptions", "user_tasks", "site_visits", "comments", "payments", "point_transactions", "listen_logs", "play_counts", "work_views"];
      for (const t of knownTables) {
        const { error: err } = await supabase.from(t).select("*").limit(0);
        console.log(`Table '${t}' exists?`, !err ? "YES" : `NO (${err.message})`);
      }
    } else {
      console.log("Tables in public schema:", tables.map(t => t.tablename));
    }
  } else {
    console.log("Inspect schema data:", data);
  }
}

inspect();
