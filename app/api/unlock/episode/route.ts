import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

const COINS_PER_EPISODE = 30;

export async function POST(req: Request) {
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
      console.error("auth getUser error:", authError);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const work_id = body?.work_id as string | undefined;
    const episode_id = body?.episode_id as string | undefined;

    if (!work_id || !episode_id) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const user_id = user.id;

    // 1. 멤버십 확인 — 멤버십 회원은 코인 불필요
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", user_id)
      .maybeSingle();

    const isSubscribed = sub ? new Date(sub.expires_at) > new Date() : false;

    if (isSubscribed) {
      return NextResponse.json({
        ok: true,
        is_subscribed: true,
        coins_left: 0,
        episode_unlocked: true,
      });
    }

    // 2. 이미 해제 여부 확인
    const { data: ent, error: entErr } = await supabaseAdmin
      .from("entitlements")
      .select("episode_unlocked")
      .eq("user_id", user_id)
      .eq("work_id", work_id)
      .eq("episode_id", String(episode_id))
      .maybeSingle();

    if (entErr) {
      console.error("entitlement read error:", entErr);
      return NextResponse.json({ error: "entitlement_read_failed" }, { status: 500 });
    }

    if (ent?.episode_unlocked) {
      return NextResponse.json({
        ok: true,
        already_unlocked: true,
        episode_unlocked: true,
      });
    }

    // 3. 지갑 확인
    let wallet;
    try {
      wallet = await syncAndGetWallet(user_id, user.created_at);
    } catch (e) {
      console.error("wallet read error:", e);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const paidPoints = Number(wallet?.points ?? 0);
    const rewardPoints = Number(wallet?.reward_points ?? 0);
    const totalCoins = paidPoints + rewardPoints;

    if (totalCoins < COINS_PER_EPISODE) {
      return NextResponse.json(
        {
          error: "not_enough_coins",
          need: COINS_PER_EPISODE,
          current: totalCoins,
        },
        { status: 400 }
      );
    }

    // 4. paid_points(유료 코인) 우선 차감, 모자라면 reward_points(리워드 코인) 차감
    let nextRewardPoints = rewardPoints;
    let nextPaidPoints = paidPoints;

    if (paidPoints >= COINS_PER_EPISODE) {
      nextPaidPoints = paidPoints - COINS_PER_EPISODE;
    } else {
      const remainder = COINS_PER_EPISODE - paidPoints;
      nextPaidPoints = 0;
      nextRewardPoints = rewardPoints - remainder;
    }

    const nextTotalCoins = nextPaidPoints + nextRewardPoints;

    // 5. 지갑 업데이트
    const { error: walletUpErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id,
          points: nextPaidPoints,
          reward_points: nextRewardPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (walletUpErr) {
      console.error("wallet update error:", walletUpErr);
      return NextResponse.json({ error: "wallet_update_failed" }, { status: 500 });
    }

    // 6. entitlements upsert (episode_unlocked = true)
    const { error: entUpErr } = await supabaseAdmin
      .from("entitlements")
      .upsert(
        {
          user_id,
          work_id,
          episode_id: String(episode_id),
          episode_unlocked: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,work_id,episode_id" }
      );

    if (entUpErr) {
      console.error("entitlement update error:", entUpErr);
      return NextResponse.json({ error: "entitlement_update_failed" }, { status: 500 });
    }

    // 7. 포인트 사용 내역 기록
    const workName =
      work_id === "cheonmujin"
        ? "천무진 봉인된 천재"
        : work_id === "hwansaeng-geomjon"
        ? "환생검존"
        : work_id;
    const desc = `${workName} ${episode_id}화 에피소드 해제`;

    await supabaseAdmin.from("point_transactions").insert({
      user_id,
      amount: -COINS_PER_EPISODE,
      transaction_type: "use",
      description: desc,
    });

    return NextResponse.json({
      ok: true,
      coins_left: nextTotalCoins,
      episode_unlocked: true,
    });
  } catch (error) {
    console.error("unlock episode error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
