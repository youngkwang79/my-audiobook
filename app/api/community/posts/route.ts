import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// GET /api/community/posts
// 게시글 목록 조회 (카테고리 필터 포함)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;

    let isAdmin = false;
    let loggedInUserId = null;
    let userLikedPostIds: string[] = [];

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const userRole = user.app_metadata?.role || user.user_metadata?.role;
        const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
        isAdmin = userRole === "admin" || hasAdminEmail;

        const { data: likes } = await supabaseAdmin
          .from("community_post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        
        if (likes) {
          userLikedPostIds = likes.map((l: any) => l.post_id);
        }
      }
    }

    let query = supabaseAdmin
      .from("community_posts")
      .select("*, comments_count:community_post_comments(count)");

    if (category && category !== "전체") {
      query = query.eq("category", category);
    }

    // 관리자가 아니면 숨겨지지 않은 글만 가져옴
    let hasIsHiddenFilter = false;
    if (!isAdmin) {
      query = query.eq("is_hidden", false);
      hasIsHiddenFilter = true;
    }

    const sort = searchParams.get("sort") || "latest";

    // 최신글/인기순 정렬
    if (sort === "popular") {
      query = query.order("likes_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    let { data: posts, error } = await query;

    if (error) {
      // 만약 is_hidden 컬럼이 없어서 에러가 발생한 경우
      if (hasIsHiddenFilter && (error.code === "PGRST204" || error.message?.includes("is_hidden"))) {
        console.warn("Fallback query without is_hidden filter because column is missing");
        let fallbackQuery = supabaseAdmin
          .from("community_posts")
          .select("*, comments_count:community_post_comments(count)");
        if (category && category !== "전체") {
          fallbackQuery = fallbackQuery.eq("category", category);
        }
        if (sort === "popular") {
          fallbackQuery = fallbackQuery.order("likes_count", { ascending: false });
        } else {
          fallbackQuery = fallbackQuery.order("created_at", { ascending: false });
        }
        const fallbackRes = await fallbackQuery;
        posts = fallbackRes.data;
        error = fallbackRes.error;
      }
    }

    if (error) {
      console.error("GET posts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 게시글에 작성자 정보 및 좋아요 여부 매핑
    const mappedPosts = (posts ?? []).map((post: any) => {
      const commentsCount = (post.comments_count && post.comments_count[0])
        ? post.comments_count[0].count
        : 0;
      return {
        ...post,
        commentsCount,
        isLiked: userLikedPostIds.includes(post.id)
      };
    });

    return NextResponse.json({ posts: mappedPosts, isAdmin });
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

    let user: any = null;
    let displayName = "강호무명";
    let faction = "협객";
    let realm = "필부";

    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Python 소설 제너레이터 등 백그라운드 관리자 업로드 허용
      // auth.users에서 실제 관리자 계정을 조회하여 유효한 UUID를 확보함으로써 외래키 제약조건 위배를 방지합니다.
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = usersData?.users?.find(
        (u: any) => u.email === "youngkwang79@gmail.com" || u.email === "youngkwang7979@gmail.com" || u.email === "admin@murimbook.com"
      );

      if (adminUser) {
        user = { id: adminUser.id };
        displayName = adminUser.user_metadata?.nickname || adminUser.user_metadata?.full_name || "백발서생 (작가)";
      } else if (usersData?.users && usersData.users.length > 0) {
        // 관리자 계정이 없을 경우 첫 번째 사용자의 ID를 가져와 외래키 제약조건을 우회합니다.
        user = { id: usersData.users[0].id };
        displayName = "백발서생 (작가)";
      } else {
        return NextResponse.json({ error: "no_registered_users" }, { status: 500 });
      }

      faction = "무림맹";
      realm = "화경";
    } else {
      const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      user = authUser;

      // 작성자의 문파/경지 게임 세이브 데이터 로드
      const { data: gameSave } = await supabaseAdmin
        .from("game_saves")
        .select("game_data")
        .eq("user_id", user.id)
        .maybeSingle();

      const gameData = gameSave?.game_data ?? {};
      faction = gameData.faction || "협객";
      realm = gameData.realm || "필부";

      displayName =
        user.user_metadata?.nickname ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "강호무명";
    }

    const body = await req.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const category = typeof body?.category === "string" ? body.category.trim() : "자유";

    if (!title || !content) {
      return NextResponse.json({ error: "title_and_content_required" }, { status: 400 });
    }

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

// PUT /api/community/posts
// 게시글 수정
export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "id_required" }, { status: 400 });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const content = typeof body?.content === "string" ? body.content.trim() : undefined;
    const category = typeof body?.category === "string" ? body.category.trim() : undefined;
    const isHidden = typeof body?.is_hidden === "boolean" ? body.is_hidden : undefined;

    // 관리자 전용 숨김/숨김해제 기능 처리
    if (isHidden !== undefined) {
      const isAdmin = user.user_metadata?.role === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      const { data: updatedPost, error: updateErr } = await supabaseAdmin
        .from("community_posts")
        .update({ is_hidden: isHidden })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, post: updatedPost });
    }

    // 일반 수정 처리 (작성자 전용)
    if (title === undefined || content === undefined || category === undefined) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const { data: updatedPost, error: updateErr } = await supabaseAdmin
      .from("community_posts")
      .update({ title, content, category })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    if (!updatedPost) {
      return NextResponse.json({ error: "post_not_found_or_forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, post: updatedPost });
  } catch (e: any) {
    console.error("PUT post error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

// DELETE /api/community/posts
// 게시글 삭제
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id_required" }, { status: 400 });
    }

    const { data: deletedPost, error: deleteErr } = await supabaseAdmin
      .from("community_posts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }
    if (!deletedPost) {
      return NextResponse.json({ error: "post_not_found_or_forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE post error:", e);
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
