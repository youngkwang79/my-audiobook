import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
 * POST /api/payments/create-order
 * body: { work_id, episode_id, amount, order_name }
 */
export async function POST(req: Request) {
  try {
    const supabase = await getUserSupabase();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

    const work_id = body.work_id || "cheonmujin";
    const episode_id = body.episode_id ? String(body.episode_id) : null;
    const amount = Number(body.amount);
    const order_name = body.order_name || "포인트 충전";

    if (!episode_id) return NextResponse.json({ error: "episode_id required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount invalid" }, { status: 400 });
    }

    // ✅ 여기서 “주문 생성”은 네 PG(포트원/토스/카카오) 로직에 맞춰 확장하면 됨
    // 지금은 뼈대만: 서버가 user 확인하고 order_id 만들어 내려줌
    const order_id = `order_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    return NextResponse.json({
      ok: true,
      order_id,
      work_id,
      episode_id,
      amount,
      order_name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
