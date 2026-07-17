import { GET } from "../app/feed/route";

async function test() {
  try {
    const res = await GET();
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
