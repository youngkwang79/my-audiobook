const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: ".env.local" });

async function test(forcePathStyle) {
  console.log(`Testing with forcePathStyle: ${forcePathStyle}`);
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle,
  });

  const bucketName = process.env.R2_BUCKET_NAME;
  const key = "cheonmujin/001/01.MP3";
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    console.log(`  SUCCESS for forcePathStyle: ${forcePathStyle}`);
  } catch (err) {
    console.error(`  FAILED: ${err.name} (HTTP: ${err.$metadata?.httpStatusCode})`);
  }
}

async function run() {
  await test(true);
  await test(false);
}

run();
