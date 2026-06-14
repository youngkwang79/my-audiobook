import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const work_id = url.searchParams.get("work_id") || "cheonmujin";
  const episode_id = url.searchParams.get("episode_id");

  // If episode_id is not provided, fetch and return all entitlements for this work

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

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", user_id)
    .maybeSingle();

  const is_subscribed = sub ? new Date(sub.expires_at) > new Date() : false;

  if (!episode_id) {
    const { data: ents, error: entError } = await supabaseAdmin
      .from("entitlements")
      .select("episode_id, unlocked_until_part, episode_unlocked")
      .eq("user_id", user_id)
      .eq("work_id", work_id);

    if (entError) {
      return NextResponse.json({ error: "entitlements_query_failed" }, { status: 500 });
    }

    const totalPoints = Number(wallet?.points ?? 0) + Number(wallet?.reward_points ?? 0);
    return NextResponse.json({
      points: totalPoints,
      is_subscribed,
      entitlements: ents || [],
    });
  }

  const { data: ent, error: entError } = await supabaseAdmin
    .from("entitlements")
    .select("unlocked_until_part, episode_unlocked")
    .eq("user_id", user_id)
    .eq("work_id", work_id)
    .eq("episode_id", String(episode_id))
    .maybeSingle();

  if (entError) {
    return NextResponse.json({ error: "entitlements_query_failed" }, { status: 500 });
  }

  let episode_unlocked = ent?.episode_unlocked ?? false;

  // 멤버십 회원이고 아직 에피소드가 영구 소장으로 기록되어있지 않은 경우
  if (is_subscribed && !episode_unlocked) {
    // 해당 에피소드가 실제로 유료(locked = true) 에피소드인지 확인
    const { data: ep } = await supabaseAdmin
      .from("episodes")
      .select("locked")
      .eq("work_id", work_id)
      .eq("id", String(episode_id))
      .maybeSingle();

    if (ep?.locked) {
      const { error: upsertErr } = await supabaseAdmin
        .from("entitlements")
        .upsert(
          {
            user_id,
            work_id,
            episode_id: String(episode_id),
            episode_unlocked: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,work_id,episode_id" }
        );

      if (!upsertErr) {
        episode_unlocked = true;
      } else {
        console.error("Failed to auto-unlock episode for subscriber in entitlements API:", upsertErr);
      }
    }
  }

  const totalPoints = Number(wallet?.points ?? 0) + Number(wallet?.reward_points ?? 0);

  return NextResponse.json({
    points: totalPoints,
    is_subscribed,
    unlocked_until_part: ent?.unlocked_until_part ?? null,
    episode_unlocked,
  });
}