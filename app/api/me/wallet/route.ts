import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
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
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;

    const { data: wallet, error } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("wallet read error:", error);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    return NextResponse.json({
      points: Number(wallet?.points ?? 0),
    });
  } catch (error) {
    console.error("wallet route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}