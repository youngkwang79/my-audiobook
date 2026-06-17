import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// GET /api/user/watch-history
// 사용자의 모든 소설 시청 기록 조회
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: history, error: selectErr } = await supabaseAdmin
      .from("watch_history")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (selectErr) {
      // 만약 아직 테이블이 생성되지 않은 상태라면 빈 배열을 조용히 반환
      if (selectErr.code === "PGRST116" || selectErr.message?.includes("relation") || selectErr.message?.includes("does not exist")) {
        return NextResponse.json({ history: [] });
      }
      return NextResponse.json({ error: selectErr.message }, { status: 500 });
    }

    return NextResponse.json({ history: history ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

// POST /api/user/watch-history
// 사용자의 소설 시청 기록 등록 또는 업데이트 (Upsert)
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const workId = body?.workId;
    const episodeId = body?.episodeId;
    const part = Number(body?.part ?? 1);

    if (!workId || !episodeId) {
      return NextResponse.json({ error: "workId_and_episodeId_required" }, { status: 400 });
    }

    const { data: updated, error: upsertErr } = await supabaseAdmin
      .from("watch_history")
      .upsert(
        {
          user_id: user.id,
          work_id: workId,
          episode_id: String(episodeId),
          part: part,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id,work_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
