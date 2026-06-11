import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

async function getUserSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) => cookieStore.set(c.name, c.value, c.options));
        },
      },
    }
  );
}

/**
 * POST /api/payments/confirm
 * (나중에 포트원/토스 결제 검증 + 지갑 충전 확정)
 */
export async function POST(req: Request) {
  try {
    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount invalid" }, { status: 400 });
    }

    // 금액에 따른 지급 포인트 매핑 (현 가격 정책 적용)
    let addPoints = 0;
    if (amount === 1090) {
      addPoints = 700; // 100 + 600
    } else if (amount === 10900) {
      addPoints = 1200; // 700 + 500
    } else if (amount === 14900) {
      addPoints = 1400; // 1000 + 400
    } else if (amount === 39800) {
      addPoints = 4000; // 2500 + 1500
    } else {
      addPoints = amount; // 폴백
    }

    let wallet;
    try {
      wallet = await syncAndGetWallet(user_id, auth.user.created_at);
    } catch (e) {
      console.error("wallet read error in payments confirm:", e);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const current = wallet.points;

    const { error } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id,
          points: current + addPoints,
          reward_points: wallet.reward_points,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 충전 내역 기록
    await supabaseAdmin
      .from("point_transactions")
      .insert({
        user_id,
        amount: addPoints,
        transaction_type: "charge",
        description: "포인트 충전",
      });

    return NextResponse.json({ ok: true, points: current + addPoints });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
