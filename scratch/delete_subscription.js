const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = "b142d125-fc44-43fe-8649-92ea979a49fd";
  console.log(`Manually deleting subscription for user: ${userId}`);

  const { data, error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId)
    .select();

  if (error) {
    console.error("Delete error:", error);
  } else {
    console.log("Delete success! Deleted rows:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
