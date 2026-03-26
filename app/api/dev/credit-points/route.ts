import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/server/supabaseAdmin";

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

    const { data: wallet, error: readErr } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (readErr) {
      console.error("wallet read error:", readErr);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const current = Number(wallet?.points ?? 0);
    const next = current + amount;

    const { error: upsertErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id,
          points: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("wallet upsert error:", upsertErr);
      return NextResponse.json({ error: "wallet_update_failed" }, { status: 500 });
    }

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