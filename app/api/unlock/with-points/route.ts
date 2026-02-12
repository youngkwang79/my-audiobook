import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const POINTS_PER_PART = 60;

async function getUserSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) => cookieStore.set(c.name, c.value, c.options));
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const user_id = auth.user.id;

    const body = await req.json().catch(() => null);
    if (!body?.episode_id) return NextResponse.json({ error: "episode_id required" }, { status: 400 });

    const work_id = body.work_id || "cheonmujin";
    const episode_id = String(body.episode_id);
    const target = Number(body.target_unlock_until_part);

    if (!Number.isFinite(target) || target < 1) {
      return NextResponse.json({ error: "target_unlock_until_part invalid" }, { status: 400 });
    }

    const { data: wallet, error: wErr } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

    const currentPoints = wallet?.points ?? 0;
    if (currentPoints < POINTS_PER_PART) {
      return NextResponse.json({ error: "not_enough_points", need: POINTS_PER_PART }, { status: 409 });
    }

    const { data: ent } = await supabaseAdmin
      .from("entitlements")
      .select("unlocked_until_part")
      .eq("user_id", user_id)
      .eq("work_id", work_id)
      .eq("episode_id", episode_id)
      .maybeSingle();

    const currentUnlocked = ent?.unlocked_until_part ?? 0;
    const nextUnlocked = Math.max(currentUnlocked, target);

    const { error: upErr } = await supabaseAdmin
      .from("wallets")
      .upsert({ user_id, points: currentPoints - POINTS_PER_PART }, { onConflict: "user_id" });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { error: eErr } = await supabaseAdmin
      .from("entitlements")
      .upsert(
        { user_id, work_id, episode_id, unlocked_until_part: nextUnlocked },
        { onConflict: "user_id,work_id,episode_id" }
      );
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      points_left: currentPoints - POINTS_PER_PART,
      unlocked_until_part: nextUnlocked,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
