import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// POST: 수동 예약 푸시 알림 등록
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 관리자 여부 검증
    const isAdmin = 
      user.email === "youngkwang79@naver.com" || 
      user.email === "youngkwang79@gmail.com" || 
      user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { title, body, url, scheduled_time } = await req.json();
    if (!title || !body || !scheduled_time) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 예약 푸시 삽입
    const { error: insertError } = await supabaseAdmin
      .from("web_push_scheduled_jobs")
      .insert({
        title,
        body,
        url: url || "/",
        scheduled_time,
        status: "pending"
      });

    if (insertError) {
      console.error("예약 푸시 등록 실패:", insertError);
      return NextResponse.json({ error: "db_error", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
