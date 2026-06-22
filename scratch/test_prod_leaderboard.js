async function testProdApi() {
  try {
    const res = await fetch("https://murimbook.com/api/game/leaderboard?gameId=breath");
    const json = await res.json();
    console.log("Prod Leaderboard response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

testProdApi();
