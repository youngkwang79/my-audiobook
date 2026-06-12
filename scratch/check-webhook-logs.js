const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("Error fetching payments logs:", error.message);
    return;
  }
  
  console.log("Recent Webhook Logs in payments table:");
  for (const p of payments) {
    console.log(`\nID: ${p.id}, Order ID: ${p.order_id}, Status: ${p.status}, Created At: ${p.created_at}`);
    console.log("Raw Payload:", JSON.stringify(p.raw_payload, null, 2));
  }
}
main();
