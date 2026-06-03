import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth getUser error in wallet API:", authError);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;
    console.log("Wallet API requested for user_id:", user_id);

    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");

    if (ref && ref.length >= 8) {
      // 1. 이미 추천인 보상을 받은 적이 있는지 확인 (중복 보상 방지)
      const { data: existingRef } = await supabaseAdmin
        .from("point_transactions")
        .select("id")
        .eq("user_id", user_id)
        .like("description", "추천인 입력 가입%")
        .maybeSingle();

      if (!existingRef) {
        // 2. 추천인의 실제 user_id 찾기
        const { data: inviterWallet } = await supabaseAdmin
          .from("wallets")
          .select("user_id")
          .like("user_id", `${ref}%`)
          .maybeSingle();

        if (inviterWallet && inviterWallet.user_id !== user_id) {
          const inviter_id = inviterWallet.user_id;

          // 3. 추천인의 지갑 싱크 및 적립
          const inviterWalletState = await syncAndGetWallet(inviter_id);
          const newInviterReward = inviterWalletState.reward_points + 500;

          await supabaseAdmin
            .from("wallets")
            .upsert({
              user_id: inviter_id,
              points: inviterWalletState.points,
              reward_points: newInviterReward,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          // 4. 추천인 거래 로그 기록
          await supabaseAdmin
            .from("point_transactions")
            .insert({
              user_id: inviter_id,
              amount: 500,
              transaction_type: "reward",
              description: `친구 초대 보상 (가입자: ${user.email ?? "알 수 없음"})`,
            });

          // 5. 추천인 당일 완료 태스크 기록 (Check-in page 연동용)
          const d = new Date();
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const todayStr = `${year}-${month}-${day}`;

          const { data: existingTask } = await supabaseAdmin
            .from("user_tasks")
            .select("task_id")
            .eq("user_id", inviter_id)
            .eq("task_id", `invite_${todayStr}`)
            .maybeSingle();

          if (!existingTask) {
            await supabaseAdmin
              .from("user_tasks")
              .insert({
                user_id: inviter_id,
                task_id: `invite_${todayStr}`,
              });
          }

          // 6. 피추천인(가입자) 거래 로그 기록 (중복 검사용)
          await supabaseAdmin
            .from("point_transactions")
            .insert({
              user_id: user_id,
              amount: 0,
              transaction_type: "reward",
              description: `추천인 입력 가입 (추천인: ${inviter_id})`,
            });
        }
      }
    }

    const wallet = await syncAndGetWallet(user_id, user.created_at);

    return NextResponse.json({
      points: wallet.points,
      reward_points: wallet.reward_points,
    });
  } catch (error) {
    console.error("Wallet route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}