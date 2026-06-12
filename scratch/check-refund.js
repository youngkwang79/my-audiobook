const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = "b142d125-fc44-43fe-8649-92ea979a49fd";

async function main() {
  console.log("=== DIAGNOSTIC REPORT FOR USER ===");
  
  // 1. Check orders
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  console.log("\nOrders:", ordersErr ? ordersErr.message : orders);

  // 2. Check wallet
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  console.log("\nWallet:", walletErr ? walletErr.message : wallet);

  // 3. Check point transactions
  const { data: txs, error: txsErr } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("\nPoint Transactions:", txsErr ? txsErr.message : txs);
}

main();
