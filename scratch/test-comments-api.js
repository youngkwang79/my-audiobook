const fetch = require("node-fetch");

async function test() {
  const url = "http://localhost:3000/api/comments?work_id=cheonmujin&episode_id=001";
  console.log("Fetching from:", url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error fetching comments:", e.message);
  }
}

test();
