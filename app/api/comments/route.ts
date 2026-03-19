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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const work_id = url.searchParams.get("work_id");
  const episode_id = url.searchParams.get("episode_id");

  if (!work_id || !episode_id) {
    return NextResponse.json(
      { error: "work_id_and_episode_id_required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("episode_comments")
    .select("id, user_email, content, created_at")
    .eq("work_id", work_id)
    .eq("episode_id", episode_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: Request) {
  try {
    const supabase = await getUserSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const work_id = typeof body?.work_id === "string" ? body.work_id : "";
    const episode_id = typeof body?.episode_id === "string" ? body.episode_id : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!work_id || !episode_id || !content) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "content_too_long" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("episode_comments").insert({
      work_id,
      episode_id,
      user_id: auth.user.id,
      user_email: auth.user.email ?? null,
      content,
    });

    if (error) {
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}