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

// 금액에 매핑된 지급 코인을 리턴하는 헬퍼 함수
const getPointsForAmount = (amount: number) => {
  if (amount === 1090) return 700;
  if (amount === 10900) return 1200;
  if (amount === 14900) return 1400;
  if (amount === 39800) return 4000;
  return amount; // fallback
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    let user = null;
    if (token) {
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        user = authData.user;
      }
    }

    if (!user) {
      const supabase = await getUserSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        user = auth.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { paymentId, reason = "고객 요청" } = await req.json().catch(() => ({}));
    if (!paymentId) {
      return NextResponse.json({ error: "missing paymentId" }, { status: 400 });
    }

    // 1. orders 테이블에서 주문 상태가 SUCCESS인 본인 주문 조회
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("user_id", user.id)
      .eq("status", "SUCCESS")
      .maybeSingle();

    if (orderError || !order) {
      console.error("[cancel-payment] Order not found or not successful:", orderError);
      return NextResponse.json({ error: "올바르지 않거나 이미 취소 처리된 주문 정보입니다." }, { status: 400 });
    }

    const pointsToDeduct = getPointsForAmount(Number(order.amount));

    // 2. 코인 상품인 경우 지갑의 코인 잔액 체크
    const isCoin = order.type === "coin" || (!order.payment_id.startsWith("m-") && !order.product_name.includes("멤버십"));
    if (isCoin) {
      const wallet = await syncAndGetWallet(user.id);
      const currentPoints = Number(wallet.points ?? 0);

      if (currentPoints < pointsToDeduct) {
        return NextResponse.json({ error: `보유하신 코인이 환불할 코인 수량(${pointsToDeduct} 코인)보다 적어 환불이 불가능합니다.` }, { status: 400 });
      }
    }

    // 3. 포트원 API 취소 요청
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("[cancel-payment] Missing PORTONE_API_SECRET");
      return NextResponse.json({ error: "서버 결제 취소 설정 오류" }, { status: 500 });
    }

    const portoneCancelRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason,
      }),
    });

    if (!portoneCancelRes.ok) {
      const errorText = await portoneCancelRes.text();
      console.error("[cancel-payment] PortOne cancel failed:", portoneCancelRes.status, errorText);
      let errMsg = "포트원 결제 취소 요청 실패";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) errMsg = errorJson.message;
      } catch (e) {}
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // 4. 취소 성공 시 DB 처리
    // 4.1) orders 테이블 status를 CANCELLED로 변경
    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({ status: "CANCELLED" })
      .eq("payment_id", paymentId);

    if (updateOrderError) {
      console.error("[cancel-payment] Update order status failed:", updateOrderError);
    }

    // 4.2) 코인 차감 및 이용내역 등록
    if (isCoin) {
      const wallet = await syncAndGetWallet(user.id);
      const { error: walletUpdateErr } = await supabaseAdmin
        .from("wallets")
        .upsert({
          user_id: user.id,
          points: Math.max(0, Number(wallet.points ?? 0) - pointsToDeduct),
          reward_points: wallet.reward_points,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (walletUpdateErr) {
        console.error("[cancel-payment] Wallet deduct failed:", walletUpdateErr);
      }

      await supabaseAdmin
        .from("point_transactions")
        .insert({
          user_id: user.id,
          amount: -pointsToDeduct,
          transaction_type: "use",
          description: "결제 취소 환불",
        });
    } else {
      // 4.3) 멤버십(구독)인 경우 구독 내역 정보 비활성화/삭제
      const { error: subDeleteError } = await supabaseAdmin
        .from("subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (subDeleteError) {
        console.error("[cancel-payment] Subscription delete failed:", subDeleteError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[cancel-payment] error:", error);
    return NextResponse.json({ error: error?.message || "server_error" }, { status: 500 });
  }
}
