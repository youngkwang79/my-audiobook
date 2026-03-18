import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

function getUserSupabase() {
  const cookieStore = cookies();

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
    const body = await req.json().catch(() => null);
    const page_path = typeof body?.page_path === "string" ? body.page_path : "/";
    const visitor_key = typeof body?.visitor_key === "string" ? body.visitor_key : "";

    if (!visitor_key) {
      return NextResponse.json({ error: "visitor_key_required" }, { status: 400 });
    }

    const supabase = getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const user_id = auth?.user?.id ?? null;

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing, error: findError } = await supabaseAdmin
      .from("site_visits")
      .select("id")
      .eq("visit_date", today)
      .eq("visitor_key", visitor_key)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: "db_find_error" }, { status: 500 });
    }

    if (!existing) {
      const { error: insertError } = await supabaseAdmin.from("site_visits").insert({
        visit_date: today,
        page_path,
        visitor_key,
        user_id,
      });

      if (insertError) {
        return NextResponse.json({ error: "db_insert_error" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}