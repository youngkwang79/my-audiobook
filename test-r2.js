const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
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

async function run() {
  const bucketName = process.env.R2_BUCKET_NAME;
  console.log("Bucket:", bucketName);
  
  // Test common extensions
  const exts = ["MP3", "mp3", "m4a"];
  for (const ext of exts) {
    const key = `cheonmujin/001/01.${ext}`;
    console.log(`Checking ${key}...`);
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      console.log(`FOUND: ${key}`);
      return;
    } catch (err) {
      console.error(`Not found: ${key} (${err.name}) HTTP: ${err.$metadata?.httpStatusCode}`);
    }
  }
}

run();
