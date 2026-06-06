import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// GET /api/community/posts
// 게시글 목록 조회 (카테고리 필터 포함)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;

    let query = supabaseAdmin
      .from("community_posts")
      .select("*, auth_users:user_id(email)");

    if (category && category !== "전체") {
      query = query.eq("category", category);
    }

    // 최신글 순으로 정렬
    const { data: posts, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("GET posts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 만약 로그인한 사용자라면, 각각의 글에 대해 본인이 좋아요(추천)를 눌렀는지 여부를 체크
    let userLikedPostIds: string[] = [];
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: likes } = await supabaseAdmin
          .from("community_post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        
        if (likes) {
          userLikedPostIds = likes.map((l: any) => l.post_id);
        }
      }
    }

    // 각 게시글에 작성자 정보 및 좋아요 여부 매핑
    const mappedPosts = (posts ?? []).map((post: any) => {
      // game_data 임시 파싱은 개별 포스트 작성 시 저장해두므로 DB에서 그대로 내려줌
      return {
        ...post,
        isLiked: userLikedPostIds.includes(post.id)
      };
    });

    return NextResponse.json({ posts: mappedPosts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

// POST /api/community/posts
// 게시글 등록
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const category = typeof body?.category === "string" ? body.category.trim() : "자유";

    if (!title || !content) {
      return NextResponse.json({ error: "title_and_content_required" }, { status: 400 });
    }

    // 작성자의 문파/경지 게임 세이브 데이터 로드
    const { data: gameSave } = await supabaseAdmin
      .from("game_saves")
      .select("game_data")
      .eq("user_id", user.id)
      .maybeSingle();

    const gameData = gameSave?.game_data ?? {};
    const faction = gameData.faction || "협객";
    const realm = gameData.realm || "필부";

    const displayName =
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "강호무명";

    const { data: newPost, error: insertErr } = await supabaseAdmin
      .from("community_posts")
      .insert({
        user_id: user.id,
        username: displayName,
        category,
        title,
        content,
        // game_saves 연동 데이터를 메타데이터로 저장해둠 (매번 조인하지 않기 위해 게시글에 캐싱)
        author_faction: faction,
        author_realm: realm,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert post error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 만약 카테고리가 "자유 대담"인 경우, 오늘 일일 문안인사(greeting) 태스크 보상 체크 및 지급
    let earnedGreetingReward = false;
    if (category === "자유 대담") {
      const todayStr = getTodayDateString();
      const taskId = `greeting_${todayStr}`;

      // 1. 이미 오늘 출석 인사를 썼는지 확인 (user_tasks 기준)
      const { data: existingTask } = await supabaseAdmin
        .from("user_tasks")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("task_id", taskId)
        .maybeSingle();

      if (!existingTask) {
        // 2. 태스크 완료 처리
        const { error: insertTaskErr } = await supabaseAdmin
          .from("user_tasks")
          .insert({ user_id: user.id, task_id: taskId });

        if (!insertTaskErr) {
          // 3. 지갑 잔액 조회/기록 및 코인 지급
          try {
            const { syncAndGetWallet } = await import("@/lib/server/walletHelper");
            const wallet = await syncAndGetWallet(user.id, user.created_at);
            const currentRewardPoints = wallet.reward_points;

            await supabaseAdmin
              .from("wallets")
              .upsert(
                {
                  user_id: user.id,
                  points: wallet.points,
                  reward_points: currentRewardPoints + 10,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              );

            // 거래 내역 추가
            await supabaseAdmin
              .from("point_transactions")
              .insert({
                user_id: user.id,
                amount: 10,
                transaction_type: "reward",
                description: "일일 연공록(출석인사) 보상",
              });

            earnedGreetingReward = true;
          } catch (walletErr) {
            console.error("wallet reward error for greeting in post creation:", walletErr);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, post: newPost, earnedGreetingReward });
  } catch (e: any) {
    console.error("POST post error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
