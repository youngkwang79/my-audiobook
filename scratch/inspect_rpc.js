const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const parts = trimmed.split("=");
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRpc() {
  console.log("Inspecting RPC routines in public schema...");
  
  // Try querying information_schema.routines
  const { data: routines, error: routinesErr } = await supabase
    .from("pg_catalog.pg_proc")
    .select("proname, proargnames")
    .ilike("proname", "%sql%");
    
  if (routinesErr) {
    console.error("Failed to query pg_proc:", routinesErr.message);
    
    // Fallback: try checking if a direct query to information_schema works
    const { data: routines2, error: routinesErr2 } = await supabase
      .from("pg_proc")
      .select("*")
      .limit(5);
    console.log("pg_proc generic error:", routinesErr2?.message);
  } else {
    console.log("Routines containing 'sql':", routines);
  }
}

inspectRpc().catch(console.error);
