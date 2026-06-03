const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

async function getSpec() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const data = await res.json();
    console.log("All paths in REST API:");
    console.log(Object.keys(data.paths).filter(p => p.startsWith("/rpc/")));
  } catch (e) {
    console.error("Error:", e);
  }
}

getSpec();
