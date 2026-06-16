const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
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
});

async function run() {
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
  const publicThumbnailsDir = path.join(process.cwd(), "public", "thumbnails");
  
  if (!fs.existsSync(publicThumbnailsDir)) {
    console.log("No public/thumbnails dir");
    return;
  }
  
  const files = fs.readdirSync(publicThumbnailsDir);
  for (const file of files) {
    if (!file.endsWith(".png") && !file.endsWith(".jpg") && !file.endsWith(".jpeg")) continue;
    
    const filePath = path.join(publicThumbnailsDir, file);
    const buffer = fs.readFileSync(filePath);
    const key = `thumbnails/${file}`;
    
    console.log(`Uploading ${key} to R2...`);
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.endsWith(".png") ? "image/png" : "image/jpeg",
        })
      );
      console.log(`Successfully uploaded ${key}`);
    } catch (e) {
      console.error(`Failed to upload ${key}`, e);
    }
  }
}

run().catch(console.error);
