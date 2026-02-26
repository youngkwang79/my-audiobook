import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // ✅ Vercel에서 Node 런타임 사용(버퍼/파일 처리)

type Seg = { start: number; end: number; text: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function getEpisodeFolder(episodeKey: string) {
  if (/^\d+$/.test(episodeKey)) return pad3(Number(episodeKey));
  const m = episodeKey.match(/^(\d+)-(.*)$/);
  if (!m) return episodeKey;
  return `${pad3(Number(m[1]))}-${m[2]}`;
}

// ✅ 너 EpisodePage에서 쓰는 R2 공개 베이스(동일하게 맞춤)
const R2_PUBLIC_BASE = "https://pub-593ff1dc4440464cb156da505f73a555.r2.dev";

// ✅ (선택) JSON 캐시를 R2에 업로드하고 싶다면 아래 ENV를 설정하고 @aws-sdk/client-s3 설치
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
async function tryPutJsonToR2(key: string, json: any) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return;

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(json),
      ContentType: "application/json; charset=utf-8",
    })
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const episodeKey = searchParams.get("episodeKey") || "";
  const partStr = searchParams.get("part") || "";

  if (!episodeKey || !partStr) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const part = Number(partStr);
  if (!Number.isFinite(part) || part < 1) {
    return NextResponse.json({ error: "bad_part" }, { status: 400 });
  }

  const folder = getEpisodeFolder(episodeKey);
  const mp3Url = `${R2_PUBLIC_BASE}/${folder}/${pad2(part)}.MP3`;
  const jsonUrl = `${R2_PUBLIC_BASE}/${folder}/${pad2(part)}.json`; // ✅ 공개 캐시(있으면 즉시 사용)

  // 1) 공개 JSON 캐시가 있으면 그걸 바로 반환
  try {
    const cached = await fetch(jsonUrl, { cache: "no-store" });
    if (cached.ok) {
      const data = await cached.json();
      if (data?.segments) return NextResponse.json(data);
    }
  } catch {
    // 캐시 실패는 무시하고 STT로 진행
  }

  // 2) 없으면 STT로 생성 (OpenAI Audio Transcriptions)
  // 모델/옵션은 OpenAI 공식 문서 기준: audio/transcriptions + verbose_json + segment timestamps
  // 참고: response_format=verbose_json + timestamp_granularities=["segment"] :contentReference[oaicite:0]{index=0}
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_OPENAI_API_KEY", hint: "Vercel 환경변수에 OPENAI_API_KEY를 추가하세요." },
      { status: 500 }
    );
  }

  // MP3 다운로드
  const mp3Res = await fetch(mp3Url, { cache: "no-store" });
  if (!mp3Res.ok) {
    return NextResponse.json({ error: "mp3_fetch_failed", mp3Url }, { status: 404 });
  }

  const ab = await mp3Res.arrayBuffer();
  const sizeBytes = ab.byteLength;

  // (현실적인 안전장치) 너무 큰 파일은 업로드 제한/타임아웃 가능성이 큼
  // OpenAI STT 가이드는 파일 크기 제한이 있을 수 있으니, 너무 크면 파트 분할/청킹 추천 :contentReference[oaicite:1]{index=1}
  const MAX_SAFE = 24 * 1024 * 1024; // 24MB 정도로 보수적
  if (sizeBytes > MAX_SAFE) {
    return NextResponse.json(
      {
        error: "mp3_too_large",
        sizeBytes,
        hint: "파트 MP3 용량이 큽니다. (권장) MP3를 더 짧게 쪼개거나, Workers/청킹 방식으로 STT를 구성하세요.",
      },
      { status: 413 }
    );
  }

  const file = new File([ab], `${folder}-${pad2(part)}.mp3`, { type: "audio/mpeg" });

  const form = new FormData();
  form.append("file", file);

  // 모델 옵션(공식 문서에 있는 STT 모델) :contentReference[oaicite:2]{index=2}
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  // OpenAI 호출
  const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!sttRes.ok) {
    const errText = await sttRes.text().catch(() => "");
    return NextResponse.json(
      { error: "stt_failed", status: sttRes.status, detail: errText.slice(0, 2000) },
      { status: 500 }
    );
  }

  const stt = await sttRes.json();

  // verbose_json 응답에 segments가 들어옴(문서) :contentReference[oaicite:3]{index=3}
  const segs: Seg[] = Array.isArray(stt?.segments)
    ? stt.segments
        .map((s: any) => ({
          start: Number(s?.start ?? 0),
          end: Number(s?.end ?? 0),
          text: String(s?.text ?? "").trim(),
        }))
        .filter((s: Seg) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.text.length > 0)
    : [];

  const payload = { episodeKey, part, segments: segs };

  // 3) (선택) R2에 JSON 캐시 업로드 (ENV 있으면 수행)
  // key는 `${folder}/${pad2(part)}.json` 로 저장해서, 다음엔 1번 단계에서 바로 읽힘
  try {
    await tryPutJsonToR2(`${folder}/${pad2(part)}.json`, payload);
  } catch {
    // 캐시 업로드 실패해도 기능은 동작해야 하므로 무시
  }

  return NextResponse.json(payload);
}
