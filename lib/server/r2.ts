import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

const isConfigured = !!(accountId && accessKeyId && secretAccessKey && bucket);

export const r2Client = isConfigured 
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

export const R2_BUCKET = bucket;

export async function putJson(key: string, json: any) {
  if (!r2Client || !R2_BUCKET) return;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: JSON.stringify(json),
      ContentType: "application/json; charset=utf-8",
    })
  );
}

export async function getJson(key: string) {
  if (!r2Client || !R2_BUCKET) return null;
  try {
    const res = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
    if (!res.Body) return null;
    const streamToString = await res.Body.transformToString();
    return JSON.parse(streamToString);
  } catch (e) {
    return null;
  }
}
