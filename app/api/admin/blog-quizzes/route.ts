import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

/**
 * GET /api/admin/blog-quizzes
 * 등록된 블로그 퀴즈 목록 및 회차 수 조회
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 관리자 여부 검증
    const hasAdminEmail =
      user.email === "youngkwang79@gmail.com" ||
      user.email === "youngkwang7979@gmail.com" ||
      user.email === "admin@murimbook.com";
    if (!hasAdminEmail && user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 그룹화하여 각 블로그 제목별 퀴즈 개수 조회
    // supabase-js에서는 GROUP BY가 직접 지원되지 않으므로, 원시 데이터를 가져와 가공하거나 rpc를 씁니다.
    // 여기서는 등록된 전체 데이터를 조회하여 가공하겠습니다 (어드민용이므로 데이터 크기가 크지 않음).
    const { data, error } = await supabaseAdmin
      .from("blog_quizzes")
      .select("blog_title, blog_url, pair_index")
      .order("blog_title", { ascending: true })
      .order("pair_index", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const groups: { [title: string]: { url: string; count: number } } = {};
    for (const row of data ?? []) {
      if (!groups[row.blog_title]) {
        groups[row.blog_title] = { url: row.blog_url, count: 0 };
      }
      groups[row.blog_title].count += 1;
    }

    const result = Object.entries(groups).map(([title, val]) => ({
      blog_title: title,
      blog_url: val.url,
      quiz_count: val.count,
    }));

    return NextResponse.json({ quizzes: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/blog-quizzes
 * 블로그 퀴즈 신규 등록 또는 벌크(JSON 파일) 일괄 업로드
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const hasAdminEmail =
      user.email === "youngkwang79@gmail.com" ||
      user.email === "youngkwang7979@gmail.com" ||
      user.email === "admin@murimbook.com";
    if (!hasAdminEmail && user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "invalid_payload", message: "데이터가 존재하지 않습니다." }, { status: 400 });
    }

    const records: any[] = [];

    if (Array.isArray(body)) {
      // 1. 일괄 배열 처리 (각 블로그별 퀴즈들이 묶인 구조 또는 씨드 데이터 형식)
      for (let i = 0; i < body.length; i++) {
        const item = body[i];
        
        // 형식 A: 씨드 데이터 형식 [ { blog_title, blog_url, pair_index, q1_question ... } ]
        if (item.blog_title && item.blog_url) {
          const q1 = item.q1 ?? item.q1_question;
          const q1_opts = item.q1_opts ?? item.q1_options;
          const q1_ans = item.q1_ans ?? item.q1_answer;
          const q2 = item.q2 ?? item.q2_question;
          const q2_opts = item.q2_opts ?? item.q2_options;
          const q2_ans = item.q2_ans ?? item.q2_answer;

          records.push({
            blog_title: String(item.blog_title).trim(),
            blog_url: String(item.blog_url).trim(),
            pair_index: item.pair_index !== undefined ? Number(item.pair_index) : 0,
            q1_question: q1,
            q1_options: q1_opts,
            q1_answer: Number(q1_ans),
            q2_question: q2,
            q2_options: q2_opts,
            q2_answer: Number(q2_ans),
            created_at: new Date().toISOString(),
          });
        }
        // 형식 B: [ { blogTitle, blogUrl, quizPairs } ]
        else if ((item.blogTitle || item.blog_title) && (item.blogUrl || item.blog_url) && Array.isArray(item.quizPairs)) {
          const title = item.blogTitle ?? item.blog_title;
          const url = item.blogUrl ?? item.blog_url;
          item.quizPairs.forEach((pair: any, idx: number) => {
            const q1 = pair.q1 ?? pair.q1_question;
            const q1_opts = pair.q1_opts ?? pair.q1_options;
            const q1_ans = pair.q1_ans ?? pair.q1_answer;
            const q2 = pair.q2 ?? pair.q2_question;
            const q2_opts = pair.q2_opts ?? pair.q2_options;
            const q2_ans = pair.q2_ans ?? pair.q2_answer;

            records.push({
              blog_title: String(title).trim(),
              blog_url: String(url).trim(),
              pair_index: idx,
              q1_question: q1,
              q1_options: q1_opts,
              q1_answer: Number(q1_ans),
              q2_question: q2,
              q2_options: q2_opts,
              q2_answer: Number(q2_ans),
              created_at: new Date().toISOString(),
            });
          });
        }
      }
    } else {
      // 2. 단일 객체 처리 { blogTitle, blogUrl, quizPairs }
      const title = body.blogTitle ?? body.blog_title;
      const url = body.blogUrl ?? body.blog_url;
      const quizPairs = body.quizPairs;

      if (title && url && Array.isArray(quizPairs)) {
        quizPairs.forEach((pair: any, idx: number) => {
          const q1 = pair.q1 ?? pair.q1_question;
          const q1_opts = pair.q1_opts ?? pair.q1_options;
          const q1_ans = pair.q1_ans ?? pair.q1_answer;
          const q2 = pair.q2 ?? pair.q2_question;
          const q2_opts = pair.q2_opts ?? pair.q2_options;
          const q2_ans = pair.q2_ans ?? pair.q2_answer;

          records.push({
            blog_title: String(title).trim(),
            blog_url: String(url).trim(),
            pair_index: idx,
            q1_question: q1,
            q1_options: q1_opts,
            q1_answer: Number(q1_ans),
            q2_question: q2,
            q2_options: q2_opts,
            q2_answer: Number(q2_ans),
            created_at: new Date().toISOString(),
          });
        });
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "invalid_payload", message: "등록할 퀴즈 데이터를 찾을 수 없거나 형식이 올바르지 않습니다." }, { status: 400 });
    }

    // DB 트랜잭션 대신 upsert로 레코드 일괄 덮어쓰기
    const { error } = await supabaseAdmin
      .from("blog_quizzes")
      .upsert(records, { onConflict: "blog_title,pair_index" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: records.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/blog-quizzes
 * 특정 블로그 제목의 모든 퀴즈 삭제
 */
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const hasAdminEmail =
      user.email === "youngkwang79@gmail.com" ||
      user.email === "youngkwang7979@gmail.com" ||
      user.email === "admin@murimbook.com";
    if (!hasAdminEmail && user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const blogTitle = searchParams.get("blogTitle");

    if (!blogTitle) {
      return NextResponse.json({ error: "blogTitle required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("blog_quizzes")
      .delete()
      .eq("blog_title", blogTitle);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
