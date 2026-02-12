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
 * POST /api/payments/confirm
 * (나중에 포트원/토스 결제 검증 + 지갑 충전 확정)
 */
export async function POST(req: Request) {
  try {
    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount invalid" }, { status: 400 });
    }

    // ✅ 임시: amount만큼 points 충전(예: 100원=100포인트면 그대로)
    // 실제 운영에서는 “결제사 서버검증” 또는 “웹훅”에서만 충전되게 바꾸는 걸 추천
    const addPoints = amount;

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    const current = wallet?.points ?? 0;

    const { error } = await supabaseAdmin
      .from("wallets")
      .upsert({ user_id, points: current + addPoints }, { onConflict: "user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, points: current + addPoints });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
