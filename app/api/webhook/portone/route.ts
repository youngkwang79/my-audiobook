import { NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  console.log("=== PortOne Webhook Triggered ===");
  // 1) IP Whitelist Check (in production)
  const isProd = process.env.NODE_ENV === "production";
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  console.log(`[Webhook IP Check] clientIp: ${clientIp}, forwardedFor: ${forwardedFor}`);

  if (isProd) {
    if (clientIp !== "52.78.5.241") {
      console.warn(`Blocked webhook request from unauthorized IP: ${clientIp}`);
      return json({ error: "forbidden" }, 403);
    }
  }

  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Webhook processing error: Missing env PORTONE_WEBHOOK_SECRET");
    return json({ error: "Missing env: PORTONE_WEBHOOK_SECRET" }, 500);
  }

  // 1) raw body
  const payload = await req.text();

  // 2) headers
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  // 3) Webhook signature validation
  try {
    await Webhook.verify(webhookSecret, payload, headers);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return json({ error: "invalid signature" }, 400);
  }

  // 4) JSON parsing
  let body: any = null;
  try {
    body = JSON.parse(payload);
  } catch (err) {
    return json({ error: "invalid json body" }, 400);
  }

  // 5) Event type filtering: process both Transaction.Paid and Transaction.Cancelled
  const eventType = body?.type;
  if (eventType !== "Transaction.Paid" && eventType !== "Transaction.Cancelled") {
    // PortOne V2 specifies that other events can be ignored but should return 200 OK.
    return json({ ok: true, message: `Ignored event: ${eventType}` });
  }

  const paymentId = body?.data?.paymentId;
  if (!paymentId) {
    return json({ error: "Missing paymentId" }, 400);
  }

  try {
    // 6) Get order details from local database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`Order not found or database error for ID ${paymentId}:`, orderError);
      return json({ error: "Order not found" }, 404);
    }

    // 6.5) Idempotency check: If order is already processed, return early
    if (eventType === "Transaction.Paid" && order.status === "SUCCESS") {
      return json({ ok: true, message: "Order already processed" });
    }
    if (eventType === "Transaction.Cancelled" && order.status === "CANCELLED") {
      return json({ ok: true, message: "Order already cancelled" });
    }

    // 7) 2차 검증: portone 단건조회 API 호출
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("Webhook processing error: Missing env PORTONE_API_SECRET");
      return json({ error: "Missing env: PORTONE_API_SECRET" }, 500);
    }

    const portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
      },
    });

    if (!portoneRes.ok) {
      console.error(`Failed to fetch payment info from PortOne API: ${portoneRes.statusText}`);
      return json({ error: "PortOne verification API request failed" }, 500);
    }

    const paymentData = await portoneRes.json();
    const actualAmount = paymentData?.amount?.total;
    const paymentStatus = paymentData?.status;

    const expectedStatus = eventType === "Transaction.Paid" ? "PAID" : "CANCELLED";
    if (paymentStatus !== expectedStatus) {
      console.warn(`Payment status on PortOne is ${paymentStatus}, expected ${expectedStatus}`);
      return json({ error: `Payment status on PortOne is ${paymentStatus}, expected ${expectedStatus}` }, 400);
    }

    // 7.5) 사용자 크로스 체크: customData.userId와 DB의 user_id 일치 확인
    const customDataRaw = paymentData?.customData;
    let customData = null;
    try {
      if (customDataRaw) {
        customData = typeof customDataRaw === "string" ? JSON.parse(customDataRaw) : customDataRaw;
      }
    } catch (err) {
      console.error("Failed to parse customData:", err);
    }
    const customUserId = customData?.userId;
    if (customUserId !== order.user_id) {
      console.error(`Security Warning: User ID mismatch! DB=${order.user_id}, PortOne customData=${customUserId}`);
      return json({ error: "User mismatch" }, 400);
    }

    // 8) Compare payment amount with DB order amount
    const orderAmount = Number(order.amount);
    if (Number(actualAmount) !== orderAmount) {
      console.error(`Security Warning: Order amount mismatch! DB=${orderAmount}, PortOne=${actualAmount}`);
      // Update order to FAILED due to spoofing/forgery
      await supabaseAdmin
        .from("orders")
        .update({ status: "FAILED" })
        .eq("payment_id", paymentId);
      return json({ error: "Amount mismatch (forgery detected)" }, 400);
    }

    if (eventType === "Transaction.Paid") {
      // 9) Update order status to SUCCESS
      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update({ status: "SUCCESS" })
        .eq("payment_id", paymentId);

      if (updateOrderError) {
        throw new Error(`Failed to update order status: ${updateOrderError.message}`);
      }

      // 10) Grant subscription/coins
      const isMembership = order.payment_id && order.payment_id.startsWith("m-");
      if (isMembership) {
        const plan = order.product_name.includes("주간")
          ? "weekly"
          : order.product_name.includes("월간")
          ? "monthly"
          : "annual";
        const daysToAdd = plan === "weekly" ? 7 : plan === "monthly" ? 30 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysToAdd);

        const { error: upsertError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: order.user_id,
            plan_type: plan,
            expires_at: expiresAt.toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) {
          throw new Error(`Failed to update subscription: ${upsertError.message}`);
        }
      } else { // coin purchase
        const amountVal = Number(order.amount);
        let addPoints = 0;
        if (amountVal === 1090) {
          addPoints = 700; // 100 + 600
        } else if (amountVal === 10900) {
          addPoints = 1200; // 700 + 500
        } else if (amountVal === 14900) {
          addPoints = 1400; // 1000 + 400
        } else if (amountVal === 39800) {
          addPoints = 4000; // 2500 + 1500
        } else {
          addPoints = amountVal;
        }

        // Sync wallet points
        const wallet = await syncAndGetWallet(order.user_id);
        const { error: walletUpdateErr } = await supabaseAdmin
          .from("wallets")
          .upsert({
            user_id: order.user_id,
            points: Number(wallet.points ?? 0) + addPoints,
            reward_points: wallet.reward_points,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (walletUpdateErr) {
          throw new Error(`Failed to update wallet points: ${walletUpdateErr.message}`);
        }

        // Record point transaction
        await supabaseAdmin
          .from("point_transactions")
          .insert({
            user_id: order.user_id,
            amount: addPoints,
            transaction_type: "charge",
            description: order.product_name,
          });
      }
    } else if (eventType === "Transaction.Cancelled") {
      // 9) Update order status to CANCELLED
      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update({ status: "CANCELLED" })
        .eq("payment_id", paymentId);

      if (updateOrderError) {
        throw new Error(`Failed to update order status: ${updateOrderError.message}`);
      }

      // 10) Revoke subscription/coins
      const isMembership = order.payment_id && order.payment_id.startsWith("m-");
      if (isMembership) {
        const { error: deleteError } = await supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq("user_id", order.user_id);

        if (deleteError) {
          throw new Error(`Failed to revoke subscription: ${deleteError.message}`);
        }
      } else { // coin purchase refund
        const amountVal = Number(order.amount);
        let deductPoints = 0;
        if (amountVal === 1090) {
          deductPoints = 700;
        } else if (amountVal === 10900) {
          deductPoints = 1200;
        } else if (amountVal === 14900) {
          deductPoints = 1400;
        } else if (amountVal === 39800) {
          deductPoints = 4000;
        } else {
          deductPoints = amountVal;
        }

        // Fetch wallet and decrement points, capping at 0
        const wallet = await syncAndGetWallet(order.user_id);
        const { error: walletUpdateErr } = await supabaseAdmin
          .from("wallets")
          .upsert({
            user_id: order.user_id,
            points: Math.max(0, Number(wallet.points ?? 0) - deductPoints),
            reward_points: wallet.reward_points,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (walletUpdateErr) {
          throw new Error(`Failed to revoke wallet points: ${walletUpdateErr.message}`);
        }

        // Record point deduction transaction
        await supabaseAdmin
          .from("point_transactions")
          .insert({
            user_id: order.user_id,
            amount: -deductPoints,
            transaction_type: "use",
            description: `결제 취소 회수: ${order.product_name}`,
          });
      }
    }

    return json({ ok: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return json({ error: error?.message || "Internal server error" }, 500);
  }
}
