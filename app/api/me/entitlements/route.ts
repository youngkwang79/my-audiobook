import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/me/entitlements?work_id=cheonmujin&episode_id=51
 * Authorization: Bearer <access_token>
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const work_id = url.searchParams.get("work_id") || "cheonmujin";
    const episode_id = url.searchParams.get("episode_id");

    if (!episode_id) {
      return NextResponse.json({ error: "episode_id is required" }, { status: 400 });
    }

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
      console.error("entitlements auth error:", authError);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;

    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (walletErr) {
      console.error("wallet read error:", walletErr);
      return NextResponse.json({ error: "wallet_read_failed" }, { status: 500 });
    }

    const { data: ent, error: entErr } = await supabaseAdmin
      .from("entitlements")
      .select("unlocked_until_part")
      .eq("user_id", user_id)
      .eq("work_id", work_id)
      .eq("episode_id", String(episode_id))
      .maybeSingle();

    if (entErr) {
      console.error("entitlement read error:", entErr);
      return NextResponse.json({ error: "entitlement_read_failed" }, { status: 500 });
    }

    return NextResponse.json({
      points: Number(wallet?.points ?? 0),
      is_subscribed: false,
      unlocked_until_part: ent?.unlocked_until_part ?? null,
    });
  } catch (error) {
    console.error("entitlements route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}