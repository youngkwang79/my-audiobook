import { NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// R2 클라이언트 초기화
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const AUDIO_EXTENSIONS = ["MP3", "mp3", "WAV", "wav", "M4A", "m4a"];

export async function POST(req: Request) {
  try {
    const { workId, episodeId, part, type } = await req.json();

    if (!workId || !episodeId || !part) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const isCaption = type === "caption";

    // 1. 멤버십 및 소장권(Entitlement) 확인
    // 먼저 무료 회차인지 확인 (하드코딩된 무료 회차 수)
    const FREE_PARTS = 8; // 기본 무료 파트
    const isFree = part <= FREE_PARTS;

    let isAuthorized = isFree;

    if (!isAuthorized) {
      // 무료가 아니면 인증 및 권한 확인 필요
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!token || token === "null") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }

      // 멤버십 확인
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      const isSubscribed =
        sub?.expires_at && new Date(sub.expires_at).getTime() > Date.now();

      if (isSubscribed) {
        isAuthorized = true;
      } else {
        // 단건 소장권 확인
        const { data: ent } = await supabaseAdmin
          .from("entitlements")
          .select("unlocked_until_part")
          .eq("user_id", user.id)
          .eq("work_id", workId)
          .eq("episode_id", String(episodeId))
          .maybeSingle();

        const unlockedUntil = ent?.unlocked_until_part || FREE_PARTS;
        if (part <= unlockedUntil) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. 파일 확장자 순차적으로 확인 후 Signed URL 발급
    // 에피소드 폴더명 포맷팅 (예: "001")
    const epNum = Number(episodeId);
    const folder = isNaN(epNum) ? String(episodeId) : String(epNum).padStart(3, "0");
    const partPadded = String(part).padStart(2, "0");

    let foundKey = null;
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    const extensions = isCaption ? ["json"] : AUDIO_EXTENSIONS;

    for (const ext of extensions) {
      const key = `${workId}/${folder}/${partPadded}.${ext}`;
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        foundKey = key;
        break; // 찾으면 중단
      } catch (err: any) {
        // NotFound 에러면 계속 진행
        if (err.name !== "NotFound") {
          console.error(`S3 HeadObject Error for ${key}:`, err);
        }
      }
    }

    if (!foundKey) {
      return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    }

    // 3. 임시 서명 주소(Signed URL) 생성 (1시간 유효)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: foundKey,
    });

    const signedUrl = await getSignedUrl(s3 as any, command, { expiresIn: 3600 });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Sign API Error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
