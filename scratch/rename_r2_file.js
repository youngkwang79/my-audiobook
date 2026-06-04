const { S3Client, CopyObjectCommand } = require("@aws-sdk/client-s3");
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
  const sourceKey = "Myeolsaguirim Chomuyeong/001/01.mp3";
  const destKey = "Myeolsaguirim Chomuyeong/001/01.MP3";

  console.log(`Copying ${sourceKey} to ${destKey} in bucket ${bucketName}...`);

  await s3.send(new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: encodeURIComponent(`${bucketName}/${sourceKey}`),
    Key: destKey,
  }));

  console.log("Copy successful!");
}

run().catch(console.error);
