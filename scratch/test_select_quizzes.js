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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSelect() {
  console.log("=== Testing SELECT on blog_quizzes ===");
  
  // 1. Test using Service Role Key (Admin)
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: adminData, error: adminErr } = await supabaseAdmin
    .from("blog_quizzes")
    .select("*");
    
  if (adminErr) {
    console.error("❌ Admin Query Failed:", adminErr.message);
  } else {
    console.log("✅ Admin Query Success! Count:", adminData?.length || 0);
  }

  // 2. Test using Public Anon Key (User client-side)
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { data: anonData, error: anonErr } = await supabaseAnon
    .from("blog_quizzes")
    .select("*");
    
  if (anonErr) {
    console.error("❌ Anon Query Failed:", anonErr.message);
  } else {
    console.log("✅ Anon Query Success! Count:", anonData?.length || 0);
  }
}

testSelect().catch(console.error);
