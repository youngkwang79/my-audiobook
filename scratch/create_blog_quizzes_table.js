const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Manually load env variables from .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Running execute_sql RPC to create public.blog_quizzes table...");
  const query = `
    CREATE TABLE IF NOT EXISTS public.blog_quizzes (
      id SERIAL PRIMARY KEY,
      blog_title TEXT NOT NULL,
      blog_url TEXT NOT NULL,
      pair_index INTEGER NOT NULL,
      q1_question TEXT NOT NULL,
      q1_options TEXT[] NOT NULL,
      q1_answer INTEGER NOT NULL,
      q2_question TEXT NOT NULL,
      q2_options TEXT[] NOT NULL,
      q2_answer INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (blog_title, pair_index)
    );
  `;
  const { data, error } = await supabase.rpc("execute_sql", { query });

  if (error) {
    console.error("Failed to create blog_quizzes table:", error);
  } else {
    console.log("Success! Table created or already exists. Data:", data);
  }
}

run().catch(console.error);
