

async function testApi() {
  try {
    const res = await fetch("http://localhost:3000/api/game/leaderboard?gameId=breath");
    const json = await res.json();
    console.log("Leaderboard response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed (maybe server is not running locally):", err.message);
  }
}

testApi();
