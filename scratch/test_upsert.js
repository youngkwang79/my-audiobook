const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 멸사귀림 작품의 free_episodes를 5로 직접 upsert 테스트
  const payload = {
    id: "Myeolsaguirim Chomuyeong",
    title: "멸사귀림(滅死歸臨) 초무영",
    description: "test",
    thumbnail: "https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/thumbnails/myeolsagwirim.png",
    episode_count: 5,
    total_episodes: 100,
    free_episodes: 5,  // 이 값이 반영되는지 테스트
    status: "연재중",
    subtitle: "[회귀물] [복수극]",
    badge: "신작",
    views: 0,
    exclusive: true,
    featured: true,
  };
  
  console.log("upsert payload:", payload);
  
  const { data, error } = await supabase
    .from("works")
    .upsert(payload)
    .select();
  
  if (error) { 
    console.error("Error:", error); 
    return; 
  }
  console.log("upsert 결과:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
