// scratch/test_pollinations.js
const fetch = require('node-fetch'); // or native fetch if Node 18+

async function test() {
  const prompt = "개방의 봉황 맹을 바로 세우다! 소설 책 표지 일러스트, 동양 무협 판타지 스타일, 극화, 고화질, book cover illustration, high quality, fantasy art, digital painting, 4k";
  const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=900&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
  
  console.log("Fetching URL:", pollUrl);
  try {
    const res = await fetch(pollUrl);
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    if (!res.ok) {
      const text = await res.text();
      console.log("Error body:", text.slice(0, 500));
    } else {
      console.log("Success! Content-Type:", res.headers.get("content-type"));
      console.log("Length:", res.headers.get("content-length"));
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
