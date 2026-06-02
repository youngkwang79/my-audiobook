import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

/**
 * GET /api/me/tasks
 * 유저가 완료한 태스크 목록 조회
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("user_tasks")
      .select("task_id")
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const completedIds = (data ?? []).map((row: { task_id: string }) => row.task_id);
    return NextResponse.json({ completedTasks: completedIds });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/me/tasks
 * 태스크 완료 처리 + 코인 지급
 * body: { taskId: string, coin: number }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const taskId: string = body?.taskId;
    const coin: number = Number(body?.coin ?? 0);

    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    if (!Number.isFinite(coin) || coin < 0) return NextResponse.json({ error: "invalid coin" }, { status: 400 });

    // 이미 완료한 태스크인지 확인 (1회성 방지)
    const { data: existing } = await supabaseAdmin
      .from("user_tasks")
      .select("task_id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "already_completed", message: "이미 완료된 태스크입니다." }, { status: 409 });
    }

    // 태스크 완료 기록 저장
    const { error: insertErr } = await supabaseAdmin
      .from("user_tasks")
      .insert({ user_id: user.id, task_id: taskId });

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // 코인 지급 (wallets upsert)
    if (coin > 0) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("reward_points")
        .eq("user_id", user.id)
        .maybeSingle();

      const current = Number(wallet?.reward_points ?? 0);
      const { error: walletErr } = await supabaseAdmin
        .from("wallets")
        .upsert({ user_id: user.id, reward_points: current + coin }, { onConflict: "user_id" });

      if (walletErr) return NextResponse.json({ error: walletErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, newRewardPoints: current + coin });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
