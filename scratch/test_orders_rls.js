const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Testing insert into orders table using Anon Client...");
  
  // Try inserting an order with a dummy UUID
  const paymentId = `c-test-${Date.now()}`;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      payment_id: paymentId,
      user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID or null
      product_name: "Test Coin",
      amount: 1000,
      customer_name: "Test Customer",
      customer_phone: "01000000000",
      customer_email: "test@example.com",
      status: "PENDING"
    })
    .select();

  if (error) {
    console.error("❌ Insertion failed!", error);
  } else {
    console.log("✅ Insertion succeeded!", data);
  }
}

run().catch(console.error);
