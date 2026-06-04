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
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
  console.log(`Listing objects in R2 bucket "${bucketName}"...`);
  
  const { Contents } = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
  }));

  if (!Contents || Contents.length === 0) {
    console.log("No objects found.");
    return;
  }

  console.log("Found objects:");
  Contents.forEach(obj => {
    console.log(`- ${obj.Key} (${obj.Size} bytes)`);
  });
}

run().catch(console.error);
