import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

/**
 * GET /api/me/entitlements?work_id=cheonmujin&episode_id=26
 * 반환:
 * { points, is_subscribed, unlocked_until_part }
 *
 * ✅ is_subscribed는 아직 테이블이 없으니 false로 고정(뼈대)
 * ✅ 나중에 subscriptions 테이블 붙이면 여기만 교체하면 됨
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const work_id = url.searchParams.get("work_id") || "cheonmujin";
    const episode_id = url.searchParams.get("episode_id");

    if (!episode_id) {
      return NextResponse.json({ error: "episode_id is required" }, { status: 400 });
    }

    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    const { data: wallet, error: wErr } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (wErr) {
      return NextResponse.json({ error: wErr.message }, { status: 500 });
    }

    const { data: ent, error: eErr } = await supabaseAdmin
      .from("entitlements")
      .select("unlocked_until_part")
      .eq("user_id", user_id)
      .eq("work_id", work_id)
      .eq("episode_id", String(episode_id))
      .maybeSingle();

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 });
    }

    const is_subscribed = false;

    return NextResponse.json({
      points: wallet?.points ?? 0,
      is_subscribed,
      unlocked_until_part: ent?.unlocked_until_part ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
