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

async function getAuthedUser(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "unauthorized", detail: "missing_bearer_token" },
        { status: 401 }
      ),
    };
  }

  const supabaseUser = getUserClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError) {
    console.error("comments auth user error:", userError);
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "user_error", detail: userError.message },
        { status: 401 }
      ),
    };
  }

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "unauthorized", detail: "invalid_access_token" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
    isAdmin: isAdminEmail(user.email),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthedUser(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const { data: comment, error: findError } = await supabaseAdmin
      .from("episode_comments")
      .select("id, user_id, is_hidden")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error("comments PATCH find error:", findError);
      return NextResponse.json(
        { error: "db_error", detail: findError.message },
        { status: 500 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { error: "not_found", detail: "comment_not_found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);

    const hasHideFlag = typeof body?.is_hidden === "boolean";
    const hasContent = typeof body?.content === "string";

    if (hasHideFlag) {
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "forbidden", detail: "admin_only_hide_action" },
          { status: 403 }
        );
      }

      const { error: hideError } = await supabaseAdmin
        .from("episode_comments")
        .update({
          is_hidden: body.is_hidden,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (hideError) {
        console.error("comments PATCH hide error:", hideError);
        return NextResponse.json(
          { error: "db_error", detail: hideError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (hasContent) {
      if (comment.user_id !== auth.user.id) {
        return NextResponse.json(
          { error: "forbidden", detail: "not_comment_owner" },
          { status: 403 }
        );
      }

      const content = body.content.trim();

      if (!content) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }

      if (content.length > 500) {
        return NextResponse.json({ error: "content_too_long" }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from("episode_comments")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("comments PATCH error:", updateError);
        return NextResponse.json(
          { error: "db_error", detail: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  } catch (error) {
    console.error("comments PATCH server error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthedUser(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const { data: comment, error: findError } = await supabaseAdmin
      .from("episode_comments")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error("comments DELETE find error:", findError);
      return NextResponse.json(
        { error: "db_error", detail: findError.message },
        { status: 500 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { error: "not_found", detail: "comment_not_found" },
        { status: 404 }
      );
    }

    if (comment.user_id !== auth.user.id) {
      return NextResponse.json(
        { error: "forbidden", detail: "not_comment_owner" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("episode_comments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("comments DELETE error:", deleteError);
      return NextResponse.json(
        { error: "db_error", detail: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("comments DELETE server error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}