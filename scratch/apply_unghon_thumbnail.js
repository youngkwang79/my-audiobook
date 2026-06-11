const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WORK_ID = "Woonghon_Kkaedaleumui_Geomgwa_Sonyeon";
const LOCAL_SRC = "C:\\Users\\owner\\.gemini\\antigravity-ide\\brain\\1bc60ce4-22e3-4edf-82e9-6005975be67c\\unghon_thumbnail_1781159596298.png";
const FILE_NAME = "unghon_kkaedaleumui.png";

async function run() {
  // 1. public/thumbnails 에 로컬 복사
  const localDestDir = path.join(__dirname, "../public/thumbnails");
  const localDest = path.join(localDestDir, FILE_NAME);
  console.log("1. 로컬 복사 중...");
  fs.mkdirSync(localDestDir, { recursive: true });
  fs.copyFileSync(LOCAL_SRC, localDest);
  console.log("   완료:", localDest);

  // 2. R2 업로드
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
  const r2Key = `thumbnails/${FILE_NAME}`;
  console.log(`2. R2 업로드 중 (${r2Key})...`);
  const buffer = fs.readFileSync(LOCAL_SRC);
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    Body: buffer,
    ContentType: "image/png",
  }));
  console.log("   업로드 완료!");

  // 3. Supabase works 테이블 업데이트
  const finalUrl = `https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/${r2Key}`;
  console.log(`3. Supabase 업데이트 중...`);
  console.log(`   URL: ${finalUrl}`);
  const { data, error } = await supabase
    .from("works")
    .update({ thumbnail: finalUrl })
    .eq("id", WORK_ID)
    .select();

  if (error) {
    console.error("   Supabase 오류:", error);
  } else {
    console.log("   Supabase 업데이트 성공!", data);
  }

  console.log("\n✅ 완료! 로컬호스트 새로고침하면 썸네일이 보입니다.");
}

run().catch(console.error);
