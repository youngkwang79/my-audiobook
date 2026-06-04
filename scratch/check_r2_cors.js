const { S3Client, GetBucketCorsCommand } = require("@aws-sdk/client-s3");
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
  const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
  console.log("Checking CORS for bucket:", bucketName);
  try {
    const data = await s3.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    console.log("CORS Configuration:", JSON.stringify(data.CORSRules, null, 2));
  } catch (err) {
    console.error("Failed to get CORS configuration:", err.name, err.message);
  }
}

run().catch(console.error);
