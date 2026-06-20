import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

// POST /api/game/score
// 미니게임 완료 후 점수 제출 및 일일 미션 보상 처리
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const gameId = body?.gameId; // 'breath', 'pulse', 'puzzle', 'dodge'
    const score = Number(body?.score ?? 0);

    if (!gameId) return NextResponse.json({ error: "gameId_required" }, { status: 400 });
    if (!Number.isFinite(score) || score < 0) return NextResponse.json({ error: "invalid_score" }, { status: 400 });

    const displayName =
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "강호무명";

    // 1. 점수 등록
    const { error: insertScoreErr } = await supabaseAdmin
      .from("game_scores")
      .insert({
        user_id: user.id,
        username: displayName,
        game_id: gameId,
        score: score,
        created_at: new Date().toISOString()
      });

    if (insertScoreErr) {
      console.error("Score insert error:", insertScoreErr);
      return NextResponse.json({ error: insertScoreErr.message }, { status: 500 });
    }

    // 2. 일일 무공수련 태스크 완료 체크 및 코인 지급 (+150 코인)
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    const taskId = `game_training_${todayStr}`;

    // 이미 완료했는지 확인
    const { data: existingTask } = await supabaseAdmin
      .from("user_tasks")
      .select("task_id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    let earnedMissionReward = false;
    let newRewardPoints = 0;

    if (!existingTask) {
      // 태스크 완료 기록 추가
      const { error: insertTaskErr } = await supabaseAdmin
        .from("user_tasks")
        .insert({ user_id: user.id, task_id: taskId });

      if (!insertTaskErr) {
        // 코인 지급 (150 코인)
        let wallet;
        try {
          wallet = await syncAndGetWallet(user.id, user.created_at);
          const current = wallet.reward_points;

          const { error: walletErr } = await supabaseAdmin
            .from("wallets")
            .upsert(
              {
                user_id: user.id,
                points: wallet.points,
                reward_points: current + 150,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (!walletErr) {
            // 거래 내역 기록
            await supabaseAdmin
              .from("point_transactions")
              .insert({
                user_id: user.id,
                amount: 150,
                transaction_type: "reward",
                description: "일일 무공수련 보상",
              });

            earnedMissionReward = true;
            newRewardPoints = current + 150;
          }
        } catch (e) {
          console.error("Daily mission wallet update error:", e);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      earnedMissionReward,
      newRewardPoints: earnedMissionReward ? newRewardPoints : undefined
    });
  } catch (e: any) {
    console.error("Score POST API error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
