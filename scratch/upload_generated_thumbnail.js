const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const localImagePath = "C:\\Users\\owner\\.gemini\\antigravity-ide\\brain\\794d3748-365f-44b5-97c9-42e40300e7d8\\myeolsagwirim_cover_1780530757101.png";
  const r2Key = "thumbnails/myeolsagwirim.png";
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";

  console.log("Reading local file...");
  const buffer = fs.readFileSync(localImagePath);

  console.log("Uploading to Cloudflare R2...");
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  const publicUrl = `https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/${r2Key}`;
  console.log("R2 Public URL:", publicUrl);

  console.log("Updating Supabase works table...");
  const { data, error } = await supabase
    .from("works")
    .update({ thumbnail: publicUrl })
    .eq("id", "myeolsagwirim")
    .select();

  if (error) {
    console.error("Supabase update error:", error);
  } else {
    console.log("Supabase updated successfully!", data);
  }
}

run().catch(console.error);
