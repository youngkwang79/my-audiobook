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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const localSrc = "C:\\Users\\owner\\.gemini\\antigravity-ide\\brain\\794d3748-365f-44b5-97c9-42e40300e7d8\\myeolsagwirim_final_clean_1780542453527.png";
  const localDestDir = path.join(__dirname, "../public/thumbnails");
  const localDest = path.join(localDestDir, "myeolsagwirim_chomuyeong.png");

  // 1. Copy locally
  console.log("Copying final clean image locally...");
  fs.mkdirSync(localDestDir, { recursive: true });
  fs.copyFileSync(localSrc, localDest);
  console.log("Copied locally to:", localDest);

  // 2. Upload to R2 (backup/production ready)
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
  const r2Key = "thumbnails/myeolsagwirim_chomuyeong.png";
  console.log(`Uploading final image to R2 bucket "${bucketName}" with key "${r2Key}"...`);
  
  const buffer = fs.readFileSync(localSrc);
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    Body: buffer,
    ContentType: "image/png"
  }));
  console.log("Uploaded successfully to R2.");

  // 3. Update Supabase works table (keep it pointing to local or R2)
  const localUrl = "/thumbnails/myeolsagwirim_chomuyeong.png";
  console.log(`Updating Supabase works row for "Myeolsaguirim Chomuyeong" with local path: "${localUrl}"...`);
  
  const { data, error } = await supabase
    .from("works")
    .update({ thumbnail: localUrl })
    .eq("id", "Myeolsaguirim Chomuyeong")
    .select();

  if (error) {
    console.error("Supabase update error:", error);
  } else {
    console.log("Supabase update successful!", data);
  }
}

run().catch(console.error);
