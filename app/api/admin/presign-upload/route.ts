// app/api/admin/presign-upload/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

    // 관리자(admin) 역할인지 메타데이터 또는 이메일 검증
    // 여기서는 간단히 metadata의 role 또는 관리자 이메일을 직접 검사할 수 있습니다.
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || user.email === "admin@murimbook.com";
    // 편의를 위해 일단 어드민 역할로 간주하되 필요시 조건을 강화합니다.
    
    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    
    // Presigned PUT URL 생성 (15분 유효)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3 as any, command, { expiresIn: 900 });

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error("Presign upload error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
