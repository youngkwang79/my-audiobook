import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

function getKstCurrentWeekRange() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffset);
  
  const day = kstTime.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const mondayKst = new Date(kstTime);
  mondayKst.setUTCDate(kstTime.getUTCDate() + diffToMonday);
  mondayKst.setUTCHours(0, 0, 0, 0);
  
  const startOfWeekUtc = new Date(mondayKst.getTime() - kstOffset);
  return startOfWeekUtc;
}

// GET /api/game/leaderboard?gameId=...
// 게임별 주간 및 누적 랭킹 리더보드 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) return NextResponse.json({ error: "gameId_required" }, { status: 400 });

    const startOfWeek = getKstCurrentWeekRange().toISOString();

    // 1. 주간 랭킹 조회
    const { data: weeklyRaw, error: weeklyErr } = await supabaseAdmin
      .from("game_scores")
      .select("user_id, username, score")
      .eq("game_id", gameId)
      .gte("created_at", startOfWeek);

    if (weeklyErr) {
      console.error("weekly leaderboard err:", weeklyErr);
      return NextResponse.json({ error: weeklyErr.message }, { status: 500 });
    }

    // 주간 데이터 유저별 최대값 가공
    const weeklyUserMax: Record<string, { user_id: string; username: string; score: number }> = {};
    (weeklyRaw ?? []).forEach((row: any) => {
      const key = row.user_id || row.username;
      if (!weeklyUserMax[key] || row.score > weeklyUserMax[key].score) {
        weeklyUserMax[key] = { user_id: row.user_id, username: row.username, score: row.score };
      }
    });

    const weeklyRankings = Object.values(weeklyUserMax)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const participantsCount = Object.keys(weeklyUserMax).length;

    // 2. 누적(All-Time) 랭킹 조회 (상위 200개 추출 후 유저별 최대값)
    const { data: allTimeRaw, error: allTimeErr } = await supabaseAdmin
      .from("game_scores")
      .select("user_id, username, score")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(300);

    if (allTimeErr) {
      console.error("alltime leaderboard err:", allTimeErr);
      return NextResponse.json({ error: allTimeErr.message }, { status: 500 });
    }

    const allTimeUserMax: Record<string, { user_id: string; username: string; score: number }> = {};
    (allTimeRaw ?? []).forEach((row: any) => {
      const key = row.user_id || row.username;
      if (!allTimeUserMax[key] || row.score > allTimeUserMax[key].score) {
        allTimeUserMax[key] = { user_id: row.user_id, username: row.username, score: row.score };
      }
    });

    const allTimeRankings = Object.values(allTimeUserMax)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      weeklyRankings,
      allTimeRankings,
      participantsCount
    });
  } catch (e: any) {
    console.error("Leaderboard GET error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
