import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// GET /api/community/comments
// 특정 게시글의 댓글 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) return NextResponse.json({ error: "postId_required" }, { status: 400 });

    const { data: comments, error } = await supabaseAdmin
      .from("community_post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("GET comments error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

// POST /api/community/comments
// 댓글 작성
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const postId = body?.postId;
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!postId || !content) {
      return NextResponse.json({ error: "postId_and_content_required" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "comment_too_long", message: "댓글은 500자 이하로 작성해주세요." }, { status: 400 });
    }

    const displayName =
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "강호무명";

    const { data: comment, error: insertErr } = await supabaseAdmin
      .from("community_post_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        username: displayName,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Comment insert error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comment });
  } catch (e: any) {
    console.error("POST comment error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
