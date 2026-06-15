import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// R2 클라이언트 초기화
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// 스트림을 버퍼로 변환하는 헬퍼 함수
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filenameParam = resolvedParams.filename;
    if (!filenameParam || filenameParam.length === 0) {
      return new Response("Missing filename", { status: 400 });
    }

    const filepath = filenameParam.join("/");
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    const r2Key = `thumbnails/${filepath}`;

    // 1. Cloudflare R2 스토리지에서 먼저 조회 시도
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
      });
      const response = await s3.send(command);
      
      if (response.Body) {
        const buffer = await streamToBuffer(response.Body as Readable);
        const contentType = response.ContentType || "image/png";
        
        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch (r2Err: any) {
      // NoSuchKey 또는 AccessDenied 등의 R2 에러가 발생한 경우 로그 출력 후 로컬 폴더로 fallback 진행
      console.log(`[R2 Proxy] ${r2Key} not found in R2 (${r2Err.message || r2Err.name}), trying local fallback...`);
    }

    // 2. 로컬 public/thumbnails/ 디렉토리에서 조회 시도 (로컬 개발용 및 기본 썸네일 지원)
    try {
      const localFilePath = path.join(process.cwd(), "public", "thumbnails", filepath);
      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = filepath.split(".").pop()?.toLowerCase();
        let contentType = "image/png";
        if (ext === "jpg" || ext === "jpeg") {
          contentType = "image/jpeg";
        } else if (ext === "webp") {
          contentType = "image/webp";
        } else if (ext === "gif") {
          contentType = "image/gif";
        }

        return new Response(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400", // 로컬 파일은 1일 캐싱
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch (localErr: any) {
      console.error(`[R2 Proxy Error] Local fallback read error:`, localErr);
    }

    // 3. 둘 다 없는 경우 404 리턴
    return new Response("Thumbnail Not Found", { status: 404 });
  } catch (globalErr: any) {
    console.error(`[R2 Proxy Global Error]`, globalErr);
    return new Response("Internal Server Error", { status: 500 });
  }
}
