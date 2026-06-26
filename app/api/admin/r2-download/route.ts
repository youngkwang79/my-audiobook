import { NextResponse } from "next/server";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import * as archiverModule from "archiver";
import type { Archiver } from "archiver";
import { PassThrough, Readable } from "stream";

type ArchiverModuleWithZip = typeof archiverModule & {
  ZipArchive: new (options?: unknown) => Archiver;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "murimbook-audio";

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;

  const hasAdminEmail =
    user.email === "youngkwang79@gmail.com" ||
    user.email === "youngkwang7979@gmail.com" ||
    user.email === "admin@murimbook.com";

  return user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;
}

function makeSafeName(name: string): string {
  return name.replace(/[^\p{L}\p{N}\- ]/gu, "").trim().substring(0, 50) || "download";
}

export async function POST(req: Request) {
  try {
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, workId, keys, workTitle, batchIndex } = body;

    if (action === "list") {
      if (!workId) {
        return NextResponse.json({ error: "missing_workId" }, { status: 400 });
      }

      const prefix = `${workId}/`;
      const allObjects: { key: string; size: number; lastModified: string }[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          })
        );

        for (const obj of response.Contents || []) {
          const key = obj.Key || "";
          if (/\.(mp3|wav|m4a)$/i.test(key)) {
            allObjects.push({
              key,
              size: obj.Size || 0,
              lastModified: obj.LastModified?.toISOString() || "",
            });
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      const episodes: Record<string, { key: string; size: number; lastModified: string; partName: string }[]> = {};

      for (const obj of allObjects) {
        const parts = obj.key.replace(prefix, "").split("/");
        const episodeFolder = parts.length >= 2 ? parts[0] : "unknown";
        const fileName = parts.length >= 2 ? parts.slice(1).join("/") : parts[0];
        episodes[episodeFolder] ||= [];
        episodes[episodeFolder].push({ ...obj, partName: fileName });
      }

      const sortedEpisodes = Object.entries(episodes)
        .sort(([a], [b]) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
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
        totalSize: allObjects.reduce((sum, obj) => sum + obj.size, 0),
        episodes: sortedEpisodes,
      });
    }

    if (action === "download-zip") {
      if (!Array.isArray(keys) || keys.length === 0) {
        return NextResponse.json({ error: "no_files_selected" }, { status: 400 });
      }

      const archive = new (archiverModule as ArchiverModuleWithZip).ZipArchive({ zlib: { level: 0 } });
      const passthrough = new PassThrough();
      archive.pipe(passthrough);

      for (const key of keys) {
        try {
          const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
          if (!response.Body) continue;

          const relativePath = key.includes("/") ? key.substring(key.indexOf("/") + 1) : key;
          archive.append(response.Body as Readable, { name: relativePath });
        } catch (err: unknown) {
          console.error(`Failed to fetch ${key} from R2:`, err);
          archive.append(`R2 download failed: ${getErrorMessage(err)}\n`, {
            name: `_errors/${key.replace(/[\\/]/g, "_")}.txt`,
          });
        }
      }

      archive.finalize();

      const webStream = new ReadableStream({
        start(controller) {
          passthrough.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
          passthrough.on("end", () => controller.close());
          passthrough.on("error", (err) => controller.error(err));
        },
      });

      const suffix = Number.isFinite(Number(batchIndex)) ? `_part${Number(batchIndex) + 1}` : "";
      const safeTitle = makeSafeName(workTitle || workId || "download");

      return new Response(webStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(`${safeTitle}_audio${suffix}.zip`)}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("R2 Download API Error:", error);
    return NextResponse.json({ error: "server_error", details: getErrorMessage(error) }, { status: 500 });
  }
}
