import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

async function getUserSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const body = await req.json().catch(() => null);
    const page_path = typeof body?.page_path === "string" ? body.page_path : "/";

    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    const user = auth?.user ?? null;

    let visitorId = cookieStore.get("visitor_id")?.value;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    const visitor_key = user ? `user:${user.id}` : `guest:${visitorId}`;
    const user_id = user?.id ?? null;
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing, error: findError } = await supabaseAdmin
      .from("site_visits")
      .select("id")
      .eq("visit_date", today)
      .eq("visitor_key", visitor_key)
      .maybeSingle();

    if (findError) {
      console.error("visit find error:", findError);
      return NextResponse.json(
        { error: "db_find_error", detail: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from("site_visits")
        .insert({
          visit_date: today,
          page_path,
          visitor_key,
          user_id,
        });

      if (insertError) {
        console.error("visit insert error:", insertError);
        return NextResponse.json(
          { error: "db_insert_error", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    const res = NextResponse.json({
      ok: true,
      alreadyCounted: !!existing,
    });

    if (!cookieStore.get("visitor_id")) {
      res.cookies.set("visitor_id", visitorId, {
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (error) {
    console.error("visit server error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}