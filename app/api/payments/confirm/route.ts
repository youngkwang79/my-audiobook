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
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    let user = null;
    let user_created_at = "";
    if (token) {
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        user = authData.user;
        user_created_at = authData.user.created_at;
      }
    }

    if (!user) {
      const supabase = await getUserSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        user = auth.user;
        user_created_at = auth.user.created_at;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

    const paymentId = body?.paymentId;
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    // 1) DB에서 주문 정보 조회
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`Order not found or database error for confirmation ID ${paymentId}:`, orderError);
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    // 사용자 검증
    if (order.user_id !== user_id) {
      return NextResponse.json({ error: "user_mismatch" }, { status: 403 });
    }

    // 이미 성공 처리된 경우 얼리 리턴 (중복 지급 방지)
    if (order.status === "SUCCESS") {
      return NextResponse.json({ ok: true, message: "already processed" });
    }

    // 2) 포트원 API 단건 조회를 통한 결제 유효성 및 실제 결제 완료 여부 검증
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("Payment confirmation error: Missing env PORTONE_API_SECRET");
      return NextResponse.json({ error: "Missing env: PORTONE_API_SECRET" }, { status: 500 });
    }

    const portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
      },
    });

    if (!portoneRes.ok) {
      console.error(`Failed to fetch payment info from PortOne API: ${portoneRes.statusText}`);
      return NextResponse.json({ error: "PortOne verification API request failed" }, { status: 500 });
    }

    const paymentData = await portoneRes.json();
    const actualAmount = paymentData?.amount?.total;
    const paymentStatus = paymentData?.status;

    if (paymentStatus !== "PAID") {
      console.warn(`Payment confirmation: Status on PortOne is ${paymentStatus}, expected PAID`);
      return NextResponse.json({ error: `Payment status on PortOne is ${paymentStatus}, expected PAID` }, { status: 400 });
    }

    // 결제 금액 위변조 검증
    const orderAmount = Number(order.amount);
    if (Number(actualAmount) !== orderAmount) {
      console.error(`Security Warning: Amount mismatch in confirmation! DB=${orderAmount}, PortOne=${actualAmount}`);
      await supabaseAdmin
        .from("orders")
        .update({ status: "FAILED" })
        .eq("payment_id", paymentId);
      return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }

    // 3) 원자적 상태 변경 시도 (Race Condition 방지)
    const { data: updatedOrder, error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({ status: "SUCCESS" })
      .eq("payment_id", paymentId)
      .eq("status", "PENDING") // PENDING 상태인 것만 SUCCESS로 변경 가능
      .select();

    if (updateOrderError || !updatedOrder || updatedOrder.length === 0) {
      // 이미 웹훅 등에서 먼저 SUCCESS로 변경했는지 재확인
      const { data: checkOrder } = await supabaseAdmin
        .from("orders")
        .select("status")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (checkOrder?.status === "SUCCESS") {
        return NextResponse.json({ ok: true, message: "already processed" });
      }
      return NextResponse.json({ error: "order_update_failed" }, { status: 500 });
    }

    // 4) 포인트 지급 진행 (DB의 검증된 주문 정보 기준)
    let addPoints = 0;
    if (orderAmount === 1090) {
      addPoints = 700; // 100 + 600
    } else if (orderAmount === 10900) {
      addPoints = 1200; // 700 + 500
    } else if (orderAmount === 14900) {
      addPoints = 1400; // 1000 + 400
    } else if (orderAmount === 39800) {
      addPoints = 4000; // 2500 + 1500
    } else {
      addPoints = orderAmount; // 폴백
    }

    let wallet;
    try {
      wallet = await syncAndGetWallet(user_id, user_created_at);
    } catch (e) {
      console.error("wallet read error in payments confirm:", e);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const current = wallet.points;

    const { error: walletError } = await supabaseAdmin
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

    if (walletError) {
      console.error("wallet upsert error in payments confirm:", walletError);
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    // 충전 내역 기록
    await supabaseAdmin
      .from("point_transactions")
      .insert({
        user_id,
        amount: addPoints,
        transaction_type: "charge",
        description: order.product_name || "포인트 충전",
      });

    return NextResponse.json({ ok: true, points: current + addPoints });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
