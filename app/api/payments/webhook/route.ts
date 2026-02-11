import { NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  // 1) raw body 문자열로 받기 (중요)
  const payload = await req.text();

  // 2) 헤더를 객체로 모으기
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  // 3) 웹훅 서명 검증 (포트원 공식 SDK)
  //    - "payload는 JSON으로 파싱하지 말고 문자열 그대로 넣어야 함" :contentReference[oaicite:1]{index=1}
  try {
    await Webhook.verify(process.env.PORTONE_WEBHOOK_SECRET!, payload, headers);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  // 4) 이제부터 payload 신뢰 가능 → JSON 파싱
  const evt = JSON.parse(payload);

  // PortOne V2 웹훅 예시에 paymentId가 들어옴 :contentReference[oaicite:2]{index=2}
  const paymentId = evt?.data?.paymentId as string | undefined;
  const type = evt?.type as string | undefined;

  if (!paymentId || !type) return NextResponse.json({ ok: true, ignored: true });

  // ✅ 우리가 관심 있는 건 “결제 완료(승인)” 류 이벤트만 처리
  // (정확한 타입 이름은 영광님 포트원 설정/모듈에 따라 달라질 수 있어서,
  //  일단 문자열 포함으로 처리하고, 테스트 웹훅 한 번 받아서 딱 맞춰줄게요.)
  const isPaidLike =
    type.includes("Paid") || type.includes("Succeeded") || type.includes("Completed");

  if (!isPaidLike) {
    return NextResponse.json({ ok: true, ignored: true, type });
  }

  // 5) payments 테이블에서 order_id/paymentId 매칭
  //    영광님 create-order에서 만든 order_id를 PortOne paymentId로 쓰는 방식이면 여기서 바로 매칭 가능
  const { data: pay } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("order_id", paymentId)
    .maybeSingle();

  if (!pay) return NextResponse.json({ ok: true, notFound: true });

  // 6) 중복 지급 방지: 이미 paid면 종료
  if (pay.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });

  // 7) paid로 먼저 업데이트(동시에 조건: 아직 paid가 아닐 때만)
  const { data: updated, error: upErr } = await supabaseAdmin
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("order_id", paymentId)
    .neq("status", "paid")
    .select("order_id, user_id, raw_payload")
    .maybeSingle();

  if (upErr) return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  if (!updated) return NextResponse.json({ ok: true, alreadyPaid: true });

  // 8) 지갑 포인트 지급
  const user_id = updated.user_id;
  const add = Number(updated.raw_payload?.points ?? 0);
  if (!Number.isFinite(add) || add <= 0) return NextResponse.json({ ok: false, error: "invalid_points" }, { status: 400 });

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("points")
    .eq("user_id", user_id)
    .maybeSingle();

  const current = wallet?.points ?? 0;

  await supabaseAdmin
    .from("wallets")
    .upsert({ user_id, points: current + add }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true, added: add });
}
