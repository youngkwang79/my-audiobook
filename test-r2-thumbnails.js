const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
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
  const command = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME || "murimbook-audio",
    Prefix: "thumbnails/"
  });
  const res = await s3.send(command);
  console.log(res.Contents?.map(c => c.Key) || "No thumbnails in R2");
}
run().catch(console.error);
