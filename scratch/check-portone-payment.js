require("dotenv").config({ path: ".env.local" });

const portoneApiSecret = process.env.PORTONE_API_SECRET;
const paymentId = "c-dbc21a69-fbb8-4911-abdd-daceb2a8d460";

async function main() {
  console.log(`Querying PortOne API for payment ID: ${paymentId}`);
  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${portoneApiSecret}`,
    },
  });
  
  if (!res.ok) {
    console.error("Failed to query PortOne API:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("PortOne Payment Data:", JSON.stringify(data, null, 2));
}

main();
