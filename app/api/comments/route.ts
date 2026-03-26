import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/server/supabaseAdmin";

const ADMIN_EMAILS = [
  "youngkwang79@gmail.com",
];

function getUserClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

async function getOptionalUser(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!accessToken) {
    return { user: null, isAdmin: false };
  }

  const supabaseUser = getUserClient(accessToken);

  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  return {
    user,
    isAdmin: isAdminEmail(user?.email),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const work_id = url.searchParams.get("work_id");
    const episode_id = url.searchParams.get("episode_id");

    if (!work_id || !episode_id) {
      return NextResponse.json(
        { error: "work_id_and_episode_id_required" },
        { status: 400 }
      );
    }

    const auth = await getOptionalUser(req);

    let query = supabaseAdmin
      .from("episode_comments")
      .select("id, user_id, user_email, content, created_at, updated_at, is_hidden")
      .eq("work_id", work_id)
      .eq("episode_id", episode_id)
      .order("created_at", { ascending: false });

    if (!auth.isAdmin) {
      query = query.eq("is_hidden", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("comments GET db error:", error);
      return NextResponse.json(
        { error: "db_error", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: data ?? [],
      isAdmin: auth.isAdmin,
    });
  } catch (error) {
    console.error("comments GET server error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "unauthorized", detail: "missing_bearer_token" },
        { status: 401 }
      );
    }

    const supabaseUser = getUserClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError) {
      console.error("comments POST user error:", userError);
      return NextResponse.json(
        { error: "user_error", detail: userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", detail: "invalid_access_token" },
        { status: 401 }
      );
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

    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("episode_comments")
      .insert({
        work_id,
        episode_id,
        user_id: user.id,
        user_email: user.email ?? null,
        content,
        created_at: now,
        updated_at: now,
        is_hidden: false,
      });

    if (insertError) {
      console.error("comments POST insert error:", insertError);
      return NextResponse.json(
        { error: "db_error", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("comments POST server error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}