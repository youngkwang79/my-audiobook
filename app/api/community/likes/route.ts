import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// POST /api/community/likes
// 추천(좋아요) 토글
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const postId = body?.postId;

    if (!postId) return NextResponse.json({ error: "postId_required" }, { status: 400 });

    // 1. 이미 추천했는지 검사
    const { data: existing } = await supabaseAdmin
      .from("community_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    let isLiked = false;
    let change = 0;

    if (existing) {
      // 이미 추천한 경우 -> 추천 취소
      const { error: deleteErr } = await supabaseAdmin
        .from("community_post_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      change = -1;
    } else {
      // 추천하지 않은 경우 -> 추천 추가
      const { error: insertErr } = await supabaseAdmin
        .from("community_post_likes")
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
      isLiked = true;
      change = 1;
    }

    // 2. 게시글의 likes_count 캐시 업데이트
    const { data: post } = await supabaseAdmin
      .from("community_posts")
      .select("likes_count")
      .eq("id", postId)
      .single();

    const currentLikes = post?.likes_count ?? 0;
    const newLikes = Math.max(0, currentLikes + change);

    await supabaseAdmin
      .from("community_posts")
      .update({ likes_count: newLikes })
      .eq("id", postId);

    return NextResponse.json({ ok: true, isLiked, likesCount: newLikes });
  } catch (e: any) {
    console.error("Like toggle error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
