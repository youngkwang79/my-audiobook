import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");
    const episode = searchParams.get("episode");
    const part = searchParams.get("part");

    if (!workId || !episode || !part) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
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
