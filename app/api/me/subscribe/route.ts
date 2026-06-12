import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { plan, paymentId, billingKey } = await req.json().catch(() => ({}));
    if (!plan || (plan !== "weekly" && plan !== "annual" && plan !== "yearly")) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }
    if (!paymentId || !billingKey) {
      return NextResponse.json({ error: "missing paymentId or billingKey" }, { status: 400 });
    }

    // Fetch order to verify details and ownership
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[subscribe] Order not found or mismatch:", orderError);
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }

    if (order.status === "SUCCESS") {
      return NextResponse.json({ error: "order already processed" }, { status: 400 });
    }

    // Call PortOne V2 billing key charge API
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("[subscribe] Missing PortOne API Secret");
      return NextResponse.json({ error: "server configuration error" }, { status: 500 });
    }

    const planName = plan === "weekly" ? "주간 멤버십 서비스" : "연간 멤버십 서비스";

    const chargeResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: "POST",
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        billingKey: billingKey,
        orderName: `멤버십 상품 구독: ${planName}`,
        amount: {
          total: Number(order.amount),
        },
        currency: "KRW",
        customer: {
          email: order.customer_email || "customer@murimbook.com",
          name: {
            full: order.customer_name,
          },
          phoneNumber: order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "") : undefined,
        },
        customData: JSON.stringify({
          userId: user.id,
        }),
      }),
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      console.error("[subscribe] PortOne billing charge failed:", chargeResponse.status, errorText);
      
      // Update order to FAILED
      await supabaseAdmin
        .from("orders")
        .update({ status: "FAILED" })
        .eq("payment_id", paymentId);

      return NextResponse.json({ error: `billing payment failed: ${errorText}` }, { status: 400 });
    }

    const chargeResult = await chargeResponse.json();
    // PortOne V2 billing key payment returns a BillingKeyPaymentSummary in the payment field,
    // which contains pgTxId and paidAt but no status field. If paidAt or pgTxId exists, it is PAID.
    const chargeStatus = chargeResult?.payment?.status || chargeResult?.status || (chargeResult?.payment?.paidAt ? "PAID" : undefined);

    if (chargeStatus !== "PAID") {
      console.warn("[subscribe] Charge status is not PAID:", chargeStatus, chargeResult);
      await supabaseAdmin
        .from("orders")
        .update({ status: "FAILED" })
        .eq("payment_id", paymentId);
      return NextResponse.json({ error: `payment status: ${chargeStatus}` }, { status: 400 });
    }

    // Update order status to SUCCESS
    await supabaseAdmin
      .from("orders")
      .update({ status: "SUCCESS" })
      .eq("payment_id", paymentId);

    const daysToAdd = plan === "weekly" ? 7 : 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    // Upsert subscription table (with fallback logic if database migration is not executed yet)
    let { error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan_type: plan,
        expires_at: expiresAt.toISOString(),
        billing_key: billingKey,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.warn("[subscribe] Failed to upsert with billing_key. Retrying without it. Error:", upsertError.message);
      // Retry without billing_key column in case database migration hasn't been run yet
      const retryResult = await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          plan_type: plan,
          expires_at: expiresAt.toISOString(),
        }, { onConflict: "user_id" });
      upsertError = retryResult.error;
    }

    if (upsertError) {
      console.error("[subscribe] db error:", upsertError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (error: any) {
    console.error("[subscribe] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
