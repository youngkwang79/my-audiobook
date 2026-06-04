import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

const REWARD_COIN = 10; // 인사말 보상 코인

function maskEmail(email?: string | null) {
  if (!email) return "익명";
  if (!email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 3 ? local.slice(0, 3) + "***" : local + "***";
  const maskedDomain = domain.length > 3 ? domain.slice(0, 3) + "***" : domain + "***";
  return `${maskedLocal}@${maskedDomain}`;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/attendance/greeting
 * 최근 작성된 출석 인사글 10개 조회
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("attendance_greetings")
      .select("id, username, content, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("greetings GET db error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ greetings: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/attendance/greeting
 * 출석 인사글 등록 + 코인 지급
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "content_required", message: "인사말을 입력해주세요." }, { status: 400 });
    }
    if (content.length > 100) {
      return NextResponse.json({ error: "content_too_long", message: "인사말은 100자 이하로 작성해주세요." }, { status: 400 });
    }

    const todayStr = getTodayDateString();
    const taskId = `greeting_${todayStr}`;

    // 1. 이미 오늘 출석 인사를 썼는지 확인 (user_tasks 기준)
    const { data: existingTask } = await supabaseAdmin
      .from("user_tasks")
      .select("task_id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existingTask) {
      return NextResponse.json({ error: "already_completed", message: "오늘 이미 출석 인사를 작성하셨습니다." }, { status: 409 });
    }

    // 2. 출석 인사 테이블에 저장
    const displayName =
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      maskEmail(user.email);

    const { error: insertGreetingErr } = await supabaseAdmin
      .from("attendance_greetings")
      .insert({
        user_id: user.id,
        username: displayName,
        content: content,
        created_at: new Date().toISOString(),
      });

    if (insertGreetingErr) {
      console.error("greetings POST insert error:", insertGreetingErr);
      return NextResponse.json({ error: insertGreetingErr.message }, { status: 500 });
    }

    // 3. 태스크 완료 처리
    const { error: insertTaskErr } = await supabaseAdmin
      .from("user_tasks")
      .insert({ user_id: user.id, task_id: taskId });

    if (insertTaskErr) {
      console.error("greetings POST task insert error:", insertTaskErr);
      return NextResponse.json({ error: insertTaskErr.message }, { status: 500 });
    }

    // 4. 코인 지급 및 거래 내역 기록
    let wallet;
    try {
      wallet = await syncAndGetWallet(user.id, user.created_at);
    } catch (e) {
      console.error("wallet read error in greeting POST:", e);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const currentRewardPoints = wallet.reward_points;
    const { error: walletErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id: user.id,
          points: wallet.points,
          reward_points: currentRewardPoints + REWARD_COIN,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (walletErr) {
      console.error("greetings POST wallet update error:", walletErr);
      return NextResponse.json({ error: walletErr.message }, { status: 500 });
    }

    // 거래 내역 추가
    await supabaseAdmin
      .from("point_transactions")
      .insert({
        user_id: user.id,
        amount: REWARD_COIN,
        transaction_type: "reward",
        description: "일일 연공록(출석인사) 보상",
      });

    return NextResponse.json({ ok: true, newRewardPoints: currentRewardPoints + REWARD_COIN });
  } catch (e: any) {
    console.error("greetings POST server error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
