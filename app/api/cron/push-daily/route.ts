import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";
import webpush from "web-push";

const vapidPublicKey = "BErJdJ0V49-dQF8kUs7fOXU_9W0ZI0wjEFq1uepwUvyMFtlyFodQbfn1p4Fkp5GacfupfJXgCXJ_cWPTUE8pJ4A";
const vapidPrivateKey = "FmkpjFCiv4-32zuMgqFyJhYwDquZsgsBdnPJJq2J1xg";

webpush.setVapidDetails(
  "mailto:murimbook@naver.com",
  vapidPublicKey,
  vapidPrivateKey
);

function getKstIsoWeek(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parseInt(parts.find(p => p.type === type)!.value);
  
  const year = getVal("year");
  const month = getVal("month");
  const dayVal = getVal("day");
  
  const d = new Date(Date.UTC(year, month - 1, dayVal));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getKstWeekRangeUtc(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parseInt(parts.find(p => p.type === type)!.value);
  
  const year = getVal("year");
  const month = getVal("month");
  const dayVal = getVal("day");
  
  const kstDateOnly = new Date(`${year}-${String(month).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}T12:00:00+09:00`);
  const kstDayNum = kstDateOnly.getDay();
  
  const diffToMonday = kstDayNum === 0 ? -6 : 1 - kstDayNum;
  
  const monday = new Date(kstDateOnly);
  monday.setDate(kstDateOnly.getDate() + diffToMonday);
  
  const mondayKstStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}T00:00:00+09:00`;
  const mondayUtc = new Date(mondayKstStr);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayKstStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}T23:59:59.999+09:00`;
  const sundayUtc = new Date(sundayKstStr);
  
  return {
    mondayUtc: mondayUtc.toISOString(),
    sundayUtc: sundayUtc.toISOString()
  };
}

async function processWeeklyRankingSettlement() {
  try {
    const nowKst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const lastWeekKst = new Date(nowKst.getTime() - 7 * 24 * 60 * 60 * 1000);
    const targetWeekCode = getKstIsoWeek(lastWeekKst);
    const { mondayUtc, sundayUtc } = getKstWeekRangeUtc(lastWeekKst);
    
    const games = [
      { id: "breath", name: "호흡 수련" },
      { id: "pulse", name: "기운 응축" },
      { id: "puzzle", name: "내공 정렬" },
      { id: "dodge", name: "보법 수련" }
    ];
    
    const settlementResults = [];
    
    for (const game of games) {
      const { data: existingSettlement, error: checkErr } = await supabaseAdmin
        .from("weekly_ranking_settlements")
        .select("id")
        .eq("year_week", targetWeekCode)
        .eq("game_id", game.id)
        .maybeSingle();
        
      if (checkErr) {
        console.error(`Check settlement error for ${game.id} / ${targetWeekCode}:`, checkErr);
        continue;
      }
      
      if (existingSettlement) {
        continue;
      }
      
      const { data: rawScores, error: scoresErr } = await supabaseAdmin
        .from("game_scores")
        .select("user_id, username, score")
        .eq("game_id", game.id)
        .gte("created_at", mondayUtc)
        .lte("created_at", sundayUtc);
        
      if (scoresErr) {
        console.error(`Fetch scores error for ${game.id} in ${targetWeekCode}:`, scoresErr);
        continue;
      }
      
      const userMaxScores: Record<string, { userId: string; username: string; score: number }> = {};
      (rawScores ?? []).forEach((row: any) => {
        const key = row.user_id;
        if (!key) return;
        if (!userMaxScores[key] || row.score > userMaxScores[key].score) {
          userMaxScores[key] = { userId: key, username: row.username, score: row.score };
        }
      });
      
      const sortedParticipants = Object.values(userMaxScores).sort((a, b) => b.score - a.score);
      const participantsCount = sortedParticipants.length;
      
      let prizeAmounts: number[] = [];
      if (participantsCount >= 30) {
        prizeAmounts = [500, 300, 100];
      } else if (participantsCount >= 10) {
        prizeAmounts = [250, 150, 50];
      } else {
        prizeAmounts = [0, 0, 0];
      }
      
      const winners = sortedParticipants.slice(0, 3);
      const winnersJson = [];
      
      if (participantsCount >= 10) {
        for (let i = 0; i < winners.length; i++) {
          const winner = winners[i];
          const prize = prizeAmounts[i];
          if (prize > 0) {
            try {
              const wallet = await syncAndGetWallet(winner.userId);
              const newRewardPoints = wallet.reward_points + prize;
              
              const { error: walletErr } = await supabaseAdmin
                .from("wallets")
                .upsert({
                  user_id: winner.userId,
                  points: wallet.points,
                  reward_points: newRewardPoints,
                  updated_at: new Date().toISOString()
                }, { onConflict: "user_id" });
                
              if (walletErr) {
                console.error(`Wallet update error for winner ${winner.userId}:`, walletErr);
                continue;
              }
              
              const desc = `주간 무공수련 랭킹 ${i + 1}등 보상 (${game.name} - ${targetWeekCode})`;
              await supabaseAdmin
                .from("point_transactions")
                .insert({
                  user_id: winner.userId,
                  amount: prize,
                  transaction_type: "reward",
                  description: desc
                });
                
              winnersJson.push({
                user_id: winner.userId,
                username: winner.username,
                score: winner.score,
                rank: i + 1,
                prize: prize
              });
            } catch (payoutErr) {
              console.error(`Payout error for user ${winner.userId}:`, payoutErr);
            }
          }
        }
      }
      
      const { error: insertSettleErr } = await supabaseAdmin
        .from("weekly_ranking_settlements")
        .insert({
          year_week: targetWeekCode,
          game_id: game.id,
          participants_count: participantsCount,
          winners: winnersJson
        });
        
      if (insertSettleErr) {
        console.error(`Insert settlement log error for ${game.id}:`, insertSettleErr);
      } else {
        settlementResults.push({
          gameId: game.id,
          yearWeek: targetWeekCode,
          participantsCount,
          winnersCount: winnersJson.length
        });
      }
    }
    
    return settlementResults;
  } catch (err: any) {
    console.error("Weekly ranking settlement main process error:", err);
    return null;
  }
}

// 자동 푸시 발송 처리 공통 함수
async function executeDailyPush(req: Request) {
  try {
    // 1. Vercel Cron 보안 검증
    // 로컬 개발 환경(NODE_ENV = development)이 아닌 프로덕션 배포 시에만 검증 작동
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      const authHeader = req.headers.get("authorization") || "";
      const cronToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      // Vercel 환경변수 CRON_SECRET와 전송된 Bearer 토큰이 일치해야 승인
      if (!cronToken || cronToken !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "unauthorized_cron" }, { status: 401 });
      }
    }

    // 주간 랭킹 정산 실행
    const settlement = await processWeeklyRankingSettlement();

    // 현재 한국 시간(KST) 구하기
    const kstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const kstHour = kstDate.getHours();

    // 2. 전체 구독 정보 가져오기
    const { data: list, error: dbError } = await supabaseAdmin
      .from("web_push_subscriptions")
      .select("id, subscription");

    if (dbError) {
      console.error("크론 푸시 구독 목록 조회 에러:", dbError);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    const deleteIds: string[] = [];
    let totalSuccessCount = 0;
    let totalFailCount = 0;

    // 일괄 발송 헬퍼 함수
    const sendPushToAll = async (payloadObj: { title: string; body: string; url: string }) => {
      if (!list || list.length === 0) return { success: 0, fail: 0 };
      const payload = JSON.stringify(payloadObj);
      let success = 0;
      let fail = 0;
      const sendPromises = list.map(async (item) => {
        try {
          const sub = typeof item.subscription === "string" ? JSON.parse(item.subscription) : item.subscription;
          await webpush.sendNotification(sub, payload);
          success++;
        } catch (err: any) {
          fail++;
          // 410 (만료된 브라우저 구독) 또는 404 (유실된 구독)일 시 DB 자동 삭제 리스트 추가
          if (err.statusCode === 410 || err.statusCode === 404) {
            deleteIds.push(item.id);
          }
          console.error(`푸시 발송 에러 (sub ID: ${item.id}):`, err.message);
        }
      });
      await Promise.all(sendPromises);
      return { success, fail };
    };

    let dailySent = false;
    let scheduledSentCount = 0;

    // 3. 매일 자동 발송 체크
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("web_push_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error("크론 푸시 템플릿 조회 실패:", settingsError);
    }

    const targetHour = settings?.daily_send_hour !== undefined ? settings.daily_send_hour : 8;

    // 한국 시간 기준 시(Hour)가 설정된 발송 시간과 일치하는 경우 실행
    if (kstHour === targetHour) {
      const title = settings?.daily_title || "🎁 [무림북] 오늘의 출석 보상 도착!";
      const body = settings?.daily_body || "잊지 말고 일일 문안인사와 출석체크를 완료하고 무료 10코인을 받아가세요! 🍵";
      const url = settings?.daily_url || "/checkin";

      const res = await sendPushToAll({ title, body, url });
      totalSuccessCount += res.success;
      totalFailCount += res.fail;
      dailySent = true;
    }

    // 4. 수동 예약 발송 체크 (status = 'pending' 이며 예약 시간이 현재 시간 이하인 항목)
    const { data: scheduledJobs, error: jobsError } = await supabaseAdmin
      .from("web_push_scheduled_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_time", new Date().toISOString());

    if (jobsError) {
      console.error("예약 푸시 목록 조회 실패:", jobsError);
    } else if (scheduledJobs && scheduledJobs.length > 0) {
      for (const job of scheduledJobs) {
        const res = await sendPushToAll({
          title: job.title,
          body: job.body,
          url: job.url || "/"
        });
        totalSuccessCount += res.success;
        totalFailCount += res.fail;
        scheduledSentCount++;

        // 예약 푸시 상태 업데이트
        await supabaseAdmin
          .from("web_push_scheduled_jobs")
          .update({ status: "sent" })
          .eq("id", job.id);
      }
    }

    let newReleaseSentCount = 0;

    // 5. 신작 자동 공개 및 알림 발송 체크
    const { data: upcomingWorks, error: upcomingError } = await supabaseAdmin
      .from("works")
      .select("*")
      .eq("status", "준비중")
      .lte("created_at", new Date().toISOString());

    if (upcomingError) {
      console.error("공개 예정 신작 목록 조회 실패:", upcomingError);
    } else if (upcomingWorks && upcomingWorks.length > 0) {
      for (const work of upcomingWorks) {
        // (1) 작품 상태를 '연재중'으로 변경
        const { error: updateError } = await supabaseAdmin
          .from("works")
          .update({ status: "연재중" })
          .eq("id", work.id);

        if (updateError) {
          console.error(`신작 상태 업데이트 에러 (작품 ID: ${work.id}):`, updateError);
          continue;
        }

        // (2) 수신동의 전체 유저에게 신작 알림 발송
        const res = await sendPushToAll({
          title: "📢 [무림북] 신작 소설 공개!",
          body: `기다리시던 신작 소설 "${work.title}" 작품이 지금 공개되었습니다! 감상하러 가기 🎧`,
          url: "/"
        });
        
        totalSuccessCount += res.success;
        totalFailCount += res.fail;
        newReleaseSentCount++;
      }
    }

    // 6. 만료된 토큰 정리
    if (deleteIds.length > 0) {
      // 중복 토큰 ID 제거 후 삭제
      const uniqueDeleteIds = Array.from(new Set(deleteIds));
      await supabaseAdmin
        .from("web_push_subscriptions")
        .delete()
        .in("id", uniqueDeleteIds);
    }

    return NextResponse.json({
      success: true,
      dailySent,
      scheduledSentCount,
      newReleaseSentCount,
      totalSentAttempts: list ? list.length * ( (dailySent ? 1 : 0) + scheduledSentCount + newReleaseSentCount ) : 0,
      totalSuccessCount,
      totalFailCount,
      cleanedCount: deleteIds.length,
      weeklyRankingSettlement: settlement
    });
  } catch (error: any) {
    console.error("크론 푸시 프로세스 실패:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return executeDailyPush(req);
}

export async function POST(req: Request) {
  return executeDailyPush(req);
}
