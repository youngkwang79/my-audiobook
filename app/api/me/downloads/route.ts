import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: record, error } = await supabaseAdmin
      .from("user_downloads")
      .select("downloaded_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ downloads: record?.downloaded_text || "[]" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { workId, episodeId, part } = await req.json();
    if (!workId || !episodeId || !part) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // Get existing downloads
    const { data: record, error: fetchError } = await supabaseAdmin
      .from("user_downloads")
      .select("downloaded_text")
      .eq("user_id", user.id)
      .maybeSingle();

    let downloads = [];
    if (record?.downloaded_text) {
      try {
        downloads = JSON.parse(record.downloaded_text);
      } catch (e) {}
    }

    // Check if already exists
    const exists = downloads.some(
      (d: any) => d.workId === workId && d.episodeId === episodeId && d.part === part
    );

    if (!exists) {
      downloads.unshift({ workId, episodeId, part, downloadedAt: new Date().toISOString() });
      
      const { error: upsertError } = await supabaseAdmin
        .from("user_downloads")
        .upsert({
          user_id: user.id,
          downloaded_text: JSON.stringify(downloads),
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error(upsertError);
        return NextResponse.json({ error: "db_upsert_error" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, downloads: JSON.stringify(downloads) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
