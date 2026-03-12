import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FREE_PARTS_DEFAULT = 8;
const POINTS_PER_PART = 60;

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

    const body = await req.json().catch(() => null);

    const work_id = body?.work_id as string | undefined;
    const episode_id = body?.episode_id as string | undefined;
    const target_unlock_until_part = Number(body?.target_unlock_until_part);

    if (!work_id || !episode_id || !Number.isFinite(target_unlock_until_part)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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

    const currentPoints = Number(wallet?.points ?? 0);

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

    const currentUnlocked = Math.max(
      FREE_PARTS_DEFAULT,
      Number(ent?.unlocked_until_part ?? FREE_PARTS_DEFAULT)
    );

    const expectedNext = currentUnlocked + 1;

    if (target_unlock_until_part <= currentUnlocked) {
      return NextResponse.json({
        ok: true,
        already_unlocked: true,
        points_left: currentPoints,
        unlocked_until_part: currentUnlocked,
      });
    }

    if (target_unlock_until_part !== expectedNext) {
      return NextResponse.json(
        {
          error: "invalid_target",
          current_unlocked_until_part: currentUnlocked,
          expected_next: expectedNext,
        },
        { status: 400 }
      );
    }

    if (currentPoints < POINTS_PER_PART) {
      return NextResponse.json(
        {
          error: "not_enough_points",
          need: POINTS_PER_PART,
          current: currentPoints,
        },
        { status: 400 }
      );
    }

    const nextPoints = currentPoints - POINTS_PER_PART;

    const { error: walletUpErr } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id,
          points: nextPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (walletUpErr) {
      console.error("wallet update error:", walletUpErr);
      return NextResponse.json({ error: "wallet_update_failed" }, { status: 500 });
    }

    const { error: entUpErr } = await supabaseAdmin
      .from("entitlements")
      .upsert(
        {
          user_id,
          work_id,
          episode_id: String(episode_id),
          unlocked_until_part: target_unlock_until_part,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,work_id,episode_id" }
      );

    if (entUpErr) {
      console.error("entitlement update error:", entUpErr);
      return NextResponse.json({ error: "entitlement_update_failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      points_left: nextPoints,
      unlocked_until_part: target_unlock_until_part,
    });
  } catch (error) {
    console.error("unlock with points error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}