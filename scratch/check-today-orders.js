const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "b142d125-fc44-43fe-8649-92ea979a49fd";

async function main() {
  const { data: orders } = await supabase
    .from("orders")
    .select("payment_id, product_name, amount, status, created_at")
    .eq("user_id", userId)
    .gte("created_at", "2026-06-12T00:00:00Z");
  
  console.log("Today's Orders:", orders);
}
main();
