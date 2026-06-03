const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

async function getSpec() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Tables list:", Object.keys(data.definitions));
    console.log("wallets properties:", data.definitions.wallets.properties);
  } catch (e) {
    console.error("Error fetching spec:", e);
  }
}

getSpec();
