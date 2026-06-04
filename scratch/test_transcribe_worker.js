const fetch = require("node-fetch"); // or use global fetch if node is modern

async function run() {
  const url = "https://transcribe-worker.uns00.workers.dev/?workId=Myeolsaguirim%20Chomuyeong&episode=1&part=1";
  console.log("Calling transcribe worker directly:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run().catch(console.error);
