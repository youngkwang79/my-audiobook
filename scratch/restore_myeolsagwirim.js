const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const targetId = "Myeolsaguirim Chomuyeong";
  const originalDescription = `[회귀물] [복수극] [의선] [치밀한 복수] [사이다]

스무 해 동안 동굴에 갇혀 세 노괴의 부속품으로 살았던 의선 초무영.
불사초를 만들어 바쳤으나, 돌아온 것은 놈들의 배신과 가족의 비극이었다.

"내가 다시 태어날 수만 있다면, 너희를 필히 죽이리라."

처절한 죽음 끝에 7살로 돌아왔다.
이제는 입장이 바뀌었다.
나는 그들이 모르는 미래를 알고, 그들은 내 의술의 무서움을 모른다.

가족을 지키고 놈들을 파멸시키기 위해, 어린 의선의 치밀하고 잔혹한 복수극이 시작된다!`;

  const originalThumbnail = "/thumbnails/myeolsagwirim_chomuyeong.png";

  console.log(`Restoring Myeolsagwirim details for ID: "${targetId}"...`);

  const { data, error } = await supabase
    .from("works")
    .update({
      description: originalDescription,
      thumbnail: originalThumbnail
    })
    .eq("id", targetId)
    .select();

  if (error) {
    console.error("Error restoring details:", error);
  } else {
    console.log("Restoration successful! Updated data:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
