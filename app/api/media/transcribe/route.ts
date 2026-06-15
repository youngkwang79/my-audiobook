import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

// R2 클라이언트 초기화
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");
    const episode = searchParams.get("episode");
    const part = searchParams.get("part");

    if (!workId || !episode || !part) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    // 1. 에피소드 및 파트 파일 키 형식 지정
    const epNum = Number(episode);
    const folder = isNaN(epNum) ? String(episode) : String(epNum).padStart(3, "0");
    const partPadded = String(part).padStart(2, "0");
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    const targetKey = `${workId}/${folder}/${partPadded}.MP3`;

    // 2. R2에 .MP3 파일이 존재하는지 검증
    let hasMp3 = false;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: targetKey }));
      hasMp3 = true;
    } catch (err: any) {
      if (err.name !== "NotFound") {
        console.error(`S3 HeadObject checking target error for ${targetKey}:`, err);
      }
    }

    // 3. 만약 .MP3 파일이 없다면 다른 대소문자/포맷 확장자들을 탐색하고 복사 수행
    if (!hasMp3) {
      const alternateExtensions = ["mp3", "WAV", "wav", "M4A", "m4a"];
      let foundSourceKey = null;

      for (const ext of alternateExtensions) {
        const key = `${workId}/${folder}/${partPadded}.${ext}`;
        try {
          await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
          foundSourceKey = key;
          break;
        } catch (err: any) {
          if (err.name !== "NotFound") {
            console.error(`S3 HeadObject probing ${key} error:`, err);
          }
        }
      }

      if (foundSourceKey) {
        console.log(`Found alternate audio file at: ${foundSourceKey}. Auto-copying to ${targetKey} for transcribe worker...`);
        try {
          await s3.send(new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: encodeURIComponent(`${bucketName}/${foundSourceKey}`),
            Key: targetKey,
          }));
          console.log(`Successfully auto-copied alternate audio file to ${targetKey}`);
        } catch (copyErr) {
          console.error(`Failed to copy alternate audio to ${targetKey}:`, copyErr);
        }
      } else {
        console.warn(`No audio file found for transcription at ${workId}/${folder}/${partPadded}.*`);
      }
    }

    const workerUrl = `https://transcribe-worker.uns00.workers.dev/?workId=${encodeURIComponent(
      workId
    )}&episode=${encodeURIComponent(episode)}&part=${encodeURIComponent(part)}`;

    console.log(`Proxying transcription request to worker: ${workerUrl}`);

    const res = await fetch(workerUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Worker returned status ${res.status}: ${errText}`);
      return NextResponse.json(
        { error: "worker_failed", status: res.status, detail: errText },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Transcribe proxy server error:", err);
    return NextResponse.json(
      { error: "server_error", detail: err.message },
      { status: 500 }
    );
  }
}

