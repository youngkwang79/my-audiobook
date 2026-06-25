import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// 크론 기반 정기결제 스케줄러 처리 함수
async function executeBillingSchedule(req: Request) {
  try {
    // 1. Vercel Cron 보안 검증 (프로덕션 배포 시)
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      const authHeader = req.headers.get("authorization") || "";
      const cronToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!cronToken || cronToken !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "unauthorized_cron" }, { status: 401 });
      }
    }

    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("[billing-schedule] Missing PortOne API Secret");
      return NextResponse.json({ error: "server configuration error" }, { status: 500 });
    }

    // 2. 만료 기한이 오늘 이하이거나 도래한 활성 구독 조회
    const nowIso = new Date().toISOString();
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .not("billing_key", "is", null) // 빌링키가 있는 구독만
      .lte("expires_at", nowIso); // 만료일이 지난 경우

    if (subError) {
      console.error("[billing-schedule] 구독 목록 조회 에러:", subError);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, processedCount: 0, message: "No expired subscriptions to process." });
    }

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        const { user_id, plan_type, billing_key } = sub;

        // 고객의 결제 성공 횟수 (product_name 기준)
        const planName = plan_type === "weekly"
          ? "주간 멤버십 서비스"
          : plan_type === "monthly"
          ? "월간 멤버십 서비스"
          : "연간 멤버십 서비스";

        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("user_id", user_id)
          .eq("product_name", planName)
          .eq("status", "SUCCESS");

        const billingCount = orders ? orders.length : 0;

        // 월간 멤버십의 경우 첫 3회는 1900원, 그 이후(4회차부터)는 4900원
        let amount = 99900; // 기본 안전값
        if (plan_type === "weekly") amount = 3000;
        else if (plan_type === "monthly") {
          amount = billingCount < 3 ? 1900 : 4900;
        } else if (plan_type === "annual" || plan_type === "yearly") {
          amount = 99900;
        }

        // 결제용 새 paymentId 생성
        const paymentId = `m-auto-${crypto.randomUUID()}`;

        // 3. 포트원 빌링키 과금 API 호출
        const chargeResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
          method: "POST",
          headers: {
            Authorization: `PortOne ${portoneApiSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billingKey: billing_key,
            orderName: `멤버십 정기결제: ${planName} (${billingCount + 1}회차)`,
            amount: { total: amount },
            currency: "KRW",
            customer: {
              email: "customer@murimbook.com", // 필요 시 users 테이블에서 가져오기
            },
            customData: JSON.stringify({ userId: user_id, isAutoBilling: true }),
          }),
        });

        const chargeResult = await chargeResponse.json();
        const chargeStatus = chargeResult?.payment?.status || chargeResult?.status || (chargeResult?.payment?.paidAt ? "PAID" : undefined);

        if (chargeResponse.ok && chargeStatus === "PAID") {
          successCount++;
          
          // orders 테이블에 성공 내역 기록
          await supabaseAdmin.from("orders").insert({
            payment_id: paymentId,
            user_id,
            product_name: planName,
            amount: amount,
            status: "SUCCESS"
          });

          // 만료일 연장 처리
          const daysToAdd = plan_type === "weekly" ? 7 : plan_type === "monthly" ? 30 : 365;
          const newExpiresAt = new Date();
          // 만료일 시점을 결제 시점으로부터 계산 (혹은 기존 만료일 + daysToAdd 도 가능하나 안전하게 오늘 기준 연장)
          newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

          await supabaseAdmin
            .from("subscriptions")
            .update({ expires_at: newExpiresAt.toISOString() })
            .eq("user_id", user_id);

        } else {
          // 결제 실패 처리
          failCount++;
          console.warn(`[billing-schedule] Payment failed for user ${user_id}:`, chargeResult);
          
          // 결제 실패 시 1회 유예하거나 상태를 처리하는 로직 추가 가능
          // 여기서는 우선 실패 내역을 로깅만 하고, billing_key를 지워 다음 번에 자동 결제 시도가 반복되지 않도록 방어
          // 원한다면 상태를 'failed'로 두거나 grace period를 둘 수 있음
          await supabaseAdmin
            .from("subscriptions")
            .update({ billing_key: null })
            .eq("user_id", user_id);
            
          await supabaseAdmin.from("orders").insert({
            payment_id: paymentId,
            user_id,
            product_name: planName,
            amount: amount,
            status: "FAILED"
          });
        }
      } catch (err) {
        failCount++;
        console.error("[billing-schedule] Error processing sub:", err);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: subscriptions.length,
      successCount,
      failCount
    });

  } catch (error: any) {
    console.error("[billing-schedule] Main process failed:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return executeBillingSchedule(req);
}

export async function POST(req: Request) {
  return executeBillingSchedule(req);
}
