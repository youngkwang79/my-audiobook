console.log("✅ PORTONE WEBHOOK POST HIT", new Date().toISOString());
import { NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Missing env: PORTONE_WEBHOOK_SECRET" }, 500);

  // 1) raw body (문자열) 그대로 받기
  const payload = await req.text();

  // 2) 헤더를 객체로
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  // 3) 서명 검증
  try {
    await Webhook.verify(secret, payload, headers);
  } catch {
    return json({ ok: false, error: "invalid signature" }, 400);
  }

  // 4) JSON 파싱 (검증 끝났으니 파싱)
  let body: any = null;
  try {
    body = JSON.parse(payload);
  } catch {
    // 파싱 실패해도 raw 저장은 가능
    body = { _raw: payload };
  }

  // ✅ PortOne payload 구조가 케이스마다 달라서 "최대한 안전하게" 뽑기
  const data = body?.data ?? body;
  const order_id =
    data?.orderId ||
    data?.order_id ||
    data?.merchant_uid ||
    data?.merchantUid ||
    data?.paymentId ||
    data?.payment_id ||
    null;

  const status = String(data?.status || body?.type || "webhook_received");

  // 5) payments에 기록/업데이트
  if (order_id) {
    await supabaseAdmin
      .from("payments")
      .update({
        status,
        raw_payload: body,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("order_id", String(order_id));
  } else {
    // order_id를 못 뽑아도 로그용으로 insert 하나 남김
    await supabaseAdmin.from("payments").insert({
      provider: "portone",
      order_id: `webhook_${Date.now()}`,
      amount: 0,
      currency: "KRW",
      status,
      raw_payload: body,
    });
  }

  return json({ ok: true });
}
