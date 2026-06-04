// app/api/admin/generate-thumbnail/route.ts
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

    const { novelId, prompt } = await req.json();
    if (!novelId || !prompt) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 2. Pollinations AI 이미지 생성 API 호출
    // 책 표지 스타일로 600x900 크기로 어울리는 일러스트 생성 요청
    const enhancePrompt = `${prompt}, book cover illustration, high quality, fantasy art, digital painting, 4k`;
    const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancePrompt)}?width=600&height=900&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    const res = await fetch(pollUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "image_generation_failed" }, { status: 500 });
    }

    const blob = await res.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // 3. Cloudflare R2에 업로드
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    const key = `thumbnails/${novelId}.png`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
      })
    );

    const publicUrl = `https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev/${key}`;

    return NextResponse.json({ thumbnailUrl: publicUrl });
  } catch (error) {
    console.error("Generate thumbnail error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
