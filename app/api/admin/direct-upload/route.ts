import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. FormData 파싱
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string;

    if (!file || !key) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";

    // 만약 썸네일 파일 업로드인 경우, 로컬 디렉토리에도 동시 저장하여 401 권한 차단 우회
    if (key.startsWith("thumbnails/")) {
      const path = require("path");
      const fs = require("fs");
      const filename = key.substring("thumbnails/".length);
      const publicThumbnailsDir = path.join(process.cwd(), "public", "thumbnails");
      if (!fs.existsSync(publicThumbnailsDir)) {
        fs.mkdirSync(publicThumbnailsDir, { recursive: true });
      }
      const localFilePath = path.join(publicThumbnailsDir, filename);
      fs.writeFileSync(localFilePath, buffer);
      console.log(`Saved manual upload thumbnail locally: ${localFilePath}`);
    }

    // 3. R2에 업로드 (서버 -> R2 이므로 CORS 영향 없음)
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Direct upload error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
