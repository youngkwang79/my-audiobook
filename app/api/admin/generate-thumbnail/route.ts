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

    // 2. Google AI Studio Imagen 4.0 이미지 생성 API 호출
    const apiKey = process.env.GOOGLE_PAID_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "missing_google_paid_api_key" }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const enhancePrompt = `${prompt}, character-centric movie poster composition, close-up portrait of main character, clean graphic cover art, completely textless, zero text, zero letters, zero signatures, zero words, blank background, no font lettering, pure character portrait illustration, high quality digital painting, 4k`;

    const imagenRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: enhancePrompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4",
          outputMimeType: "image/jpeg",
        },
      }),
    });

    if (!imagenRes.ok) {
      const errData = await imagenRes.json().catch(() => ({}));
      console.error("Imagen API error response:", errData);
      return NextResponse.json({ error: "image_generation_failed", details: errData }, { status: 500 });
    }

    const data = await imagenRes.json();
    const prediction = data.predictions?.[0];
    let imageBytes = prediction?.bytesBase64Encoded || prediction?.imageBytes || prediction?.image;
    if (typeof imageBytes === "object" && imageBytes?.imageBytes) {
      imageBytes = imageBytes.imageBytes;
    }

    if (!imageBytes) {
      return NextResponse.json({ error: "image_bytes_missing" }, { status: 500 });
    }

    const buffer = Buffer.from(imageBytes, "base64");

    // 3. 로컬 public/thumbnails/ 디렉토리에 저장 (웹서버에서 직접 서비스하므로 401 에러 원천 방지)
    const fs = require("fs");
    const path = require("path");
    const timestamp = Date.now();
    const publicThumbnailsDir = path.join(process.cwd(), "public", "thumbnails");
    if (!fs.existsSync(publicThumbnailsDir)) {
      fs.mkdirSync(publicThumbnailsDir, { recursive: true });
    }
    const localFileName = `${novelId}_${timestamp}.png`;
    const localFilePath = path.join(publicThumbnailsDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);
    
    const relativeUrl = `/api/thumbnails/${localFileName}`;

    // 4. Cloudflare R2에 백업 업로드
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    const key = `thumbnails/${novelId}_${timestamp}.png`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      })
    );

    // 작품이 기존에 존재하는 경우 DB의 썸네일 URL을 즉시 자동 업데이트
    const { data: existingWork } = await supabaseAdmin
      .from("works")
      .select("id")
      .eq("id", novelId)
      .maybeSingle();

    if (existingWork) {
      await supabaseAdmin
        .from("works")
        .update({ thumbnail: relativeUrl })
        .eq("id", novelId);
    }

    return NextResponse.json({ thumbnailUrl: relativeUrl });
  } catch (error) {
    console.error("Generate thumbnail error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
