import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

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
if (user.email !== "youngkwang79@gmailcom") {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
    const body = await req.json().catch(() => null);
    const amount = Number(body?.points ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "invalid_points" }, { status: 400 });
    }

    const user_id = user.id;

    let wallet;
    try {
      wallet = await syncAndGetWallet(user_id, user.created_at);
    } catch (e) {
      console.error("wallet read error in dev credit points:", e);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const current = wallet.points;
    const next = current + amount;

    const { error: upsertErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id,
          points: next,
          reward_points: wallet.reward_points,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("wallet upsert error:", upsertErr);
      return NextResponse.json({ error: "wallet_update_failed" }, { status: 500 });
    }

    // 개발자 충전 내역 기록
    await supabaseAdmin
      .from("point_transactions")
      .insert({
        user_id,
        amount: amount,
        transaction_type: "charge",
        description: "개발자 포인트 충전",
      });

    return NextResponse.json({
      ok: true,
      points: next,
      added: amount,
    });
  } catch (error) {
    console.error("credit points route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}