const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = "e5c0c79f-478c-4acc-8742-1ab22a280958";
  
  // 1. Check points/profile
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
    
  // 2. Check subscription
  const { data: sub, error: sError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 3. Check entitlements for episode 11
  const { data: ent, error: eError } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("work_id", "gupailbangcheonjaedeulmumyengs")
    .eq("episode_id", "11")
    .maybeSingle();

  console.log("Profile:", profile);
  console.log("Subscription:", sub);
  console.log("Entitlement for Ep 11:", ent);
}

run().catch(console.error);
