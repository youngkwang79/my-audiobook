const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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
  const key = "test-upload.txt";
  console.log("Attempting to upload to R2 bucket:", bucketName);
  
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "Hello from R2 check script",
      ContentType: "text/plain"
    }));
    console.log("UPLOAD SUCCESSFUL!");
    
    // Clean up
    console.log("Cleaning up...");
    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    }));
    console.log("Clean up successful.");
  } catch (err) {
    console.error("R2 UPLOAD FAILED:", err.name, err.message);
  }
}

run().catch(console.error);
