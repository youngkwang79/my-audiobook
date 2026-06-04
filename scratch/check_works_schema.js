const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // works 테이블의 실제 컬럼 구조 확인
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .limit(1);
  
  if (error) { console.error(error); return; }
  if (data && data.length > 0) {
    console.log("works 테이블 컬럼 목록:");
    console.log(Object.keys(data[0]));
    console.log("\n전체 데이터:");
    console.log(JSON.stringify(data[0], null, 2));
  }
}

run().catch(console.error);
