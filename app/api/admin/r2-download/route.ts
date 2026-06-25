import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require("archiver");
import { PassThrough } from "stream";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "murimbook-audio";

// 관리자 인증 헬퍼
async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;

  const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
  const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;
  return isAdmin;
}

export async function POST(req: Request) {
  try {
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, workId, keys, workTitle } = body;

    // === Action: list ===
    // R2 버킷에서 workId/ prefix 아래의 모든 오디오 파일 목록 조회
    if (action === "list") {
      if (!workId) {
        return NextResponse.json({ error: "missing_workId" }, { status: 400 });
      }

      const prefix = `${workId}/`;
      const allObjects: { key: string; size: number; lastModified: string }[] = [];
      let continuationToken: string | undefined;

      // R2에서 페이지네이션하며 전체 목록 수집
      do {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response = await s3.send(command);

        if (response.Contents) {
          for (const obj of response.Contents) {
            const key = obj.Key || "";
            // MP3/WAV/M4A 오디오 파일만 필터링
            if (/\.(mp3|wav|m4a)$/i.test(key)) {
              allObjects.push({
                key,
                size: obj.Size || 0,
                lastModified: obj.LastModified?.toISOString() || "",
              });
            }
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      // 에피소드 폴더별로 그룹핑
      const episodes: Record<string, { key: string; size: number; lastModified: string; partName: string }[]> = {};

      for (const obj of allObjects) {
        // key format: workId/episodeFolder/partNum.MP3
        const parts = obj.key.replace(prefix, "").split("/");
        const episodeFolder = parts.length >= 2 ? parts[0] : "unknown";
        const fileName = parts.length >= 2 ? parts.slice(1).join("/") : parts[0];

        if (!episodes[episodeFolder]) {
          episodes[episodeFolder] = [];
        }
        episodes[episodeFolder].push({
          ...obj,
          partName: fileName,
        });
      }

      // 에피소드 폴더 정렬 (숫자순)
      const sortedEpisodes = Object.entries(episodes)
        .sort(([a], [b]) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        })
        .map(([folder, files]) => ({
          folder,
          files: files.sort((a, b) => a.partName.localeCompare(b.partName)),
        }));

      return NextResponse.json({
        success: true,
        workId,
        totalFiles: allObjects.length,
        totalSize: allObjects.reduce((sum, o) => sum + o.size, 0),
        episodes: sortedEpisodes,
      });
    }

    // === Action: download-zip ===
    // 선택된 파일들을 ZIP 스트림으로 묶어 다운로드
    if (action === "download-zip") {
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return NextResponse.json({ error: "no_files_selected" }, { status: 400 });
      }

      const archive = archiver("zip", { zlib: { level: 1 } }); // level 1 = 빠른 압축 (MP3는 이미 압축되어 있으므로)
      const passthrough = new PassThrough();
      archive.pipe(passthrough);

      // 각 파일을 R2에서 가져와 ZIP에 추가
      for (const key of keys) {
        try {
          const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
          const response = await s3.send(command);

          if (response.Body) {
            // 파일명: workId prefix를 제거한 상대경로
            const relativePath = key.includes("/") 
              ? key.substring(key.indexOf("/") + 1) 
              : key;
            
            // Body를 Node.js Readable로 변환
            const bodyStream = response.Body as any;
            if (typeof bodyStream.transformToByteArray === "function") {
              const bytes = await bodyStream.transformToByteArray();
              archive.append(Buffer.from(bytes), { name: relativePath });
            } else {
              archive.append(bodyStream, { name: relativePath });
            }
          }
        } catch (err: any) {
          console.error(`Failed to fetch ${key} from R2:`, err.message);
        }
      }

      archive.finalize();

      // PassThrough → Web ReadableStream 변환
      const webStream = new ReadableStream({
        start(controller) {
          passthrough.on("data", (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          passthrough.on("end", () => {
            controller.close();
          });
          passthrough.on("error", (err) => {
            controller.error(err);
          });
        },
      });

      const safeTitle = (workTitle || workId || "download")
        .replace(/[^a-zA-Z0-9가-힣_\- ]/g, "")
        .substring(0, 50);

      return new Response(webStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(safeTitle)}_audio.zip"`,
          "Transfer-Encoding": "chunked",
        },
      });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error: any) {
    console.error("R2 Download API Error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
