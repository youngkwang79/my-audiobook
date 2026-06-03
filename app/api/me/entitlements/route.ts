import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const work_id = url.searchParams.get("work_id") || "cheonmujin";
  const episode_id = url.searchParams.get("episode_id");

  if (!episode_id) {
    return NextResponse.json({ error: "episode_id is required" }, { status: 400 });
  }

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

  const user_id = user.id;

  let wallet;
  try {
    wallet = await syncAndGetWallet(user_id, user.created_at);
  } catch (e) {
    return NextResponse.json({ error: "wallet_query_failed" }, { status: 500 });
  }

  const { data: ent, error: entError } = await supabaseAdmin
    .from("entitlements")
    .select("unlocked_until_part")
    .eq("user_id", user_id)
    .eq("work_id", work_id)
    .eq("episode_id", String(episode_id))
    .maybeSingle();

  if (entError) {
    return NextResponse.json({ error: "entitlements_query_failed" }, { status: 500 });
  }

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", user_id)
    .maybeSingle();

  const is_subscribed = sub ? new Date(sub.expires_at) > new Date() : false;

  const totalPoints = Number(wallet?.points ?? 0) + Number(wallet?.reward_points ?? 0);

  return NextResponse.json({
    points: totalPoints,
    is_subscribed,
    unlocked_until_part: ent?.unlocked_until_part ?? null,
  });
}