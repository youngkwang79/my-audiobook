const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking user_tasks table...");
  const { data: tasks, error: tasksErr } = await supabase.from("user_tasks").select("*");
  if (tasksErr) {
    console.error("Error fetching user_tasks:", tasksErr.message);
  } else {
    console.log("user_tasks rows (total count:", tasks.length, "):");
    console.log(tasks);
  }

  console.log("\nChecking wallets table...");
  const { data: wallets, error: walletsErr } = await supabase.from("wallets").select("*");
  if (walletsErr) {
    console.error("Error fetching wallets:", walletsErr.message);
  } else {
    console.log("wallets rows:");
    console.log(wallets);
  }
}

check();
