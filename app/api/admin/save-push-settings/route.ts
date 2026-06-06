import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

// GET: 현재 자동 알림 설정 조회
export async function GET(req: Request) {
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

    const { data, error } = await supabaseAdmin
      .from("web_push_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("웹 푸시 설정 조회 실패:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // 데이터가 없으면 초기 기본값 전달
    const settings = data || {
      daily_title: "🎁 [무림북] 오늘의 출석 보상 도착!",
      daily_body: "잊지 말고 일일 문안인사와 출석체크를 완료하고 무료 10코인을 받아가세요! 🍵",
      daily_url: "/checkin",
      daily_send_hour: 8
    };

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}

// POST: 신규 자동 알림 설정 저장
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

    const { daily_title, daily_body, daily_url, daily_send_hour } = await req.json();
    if (!daily_title || !daily_body) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 설정 업서트
    const { error: upsertError } = await supabaseAdmin
      .from("web_push_settings")
      .upsert({
        id: 1,
        daily_title,
        daily_body,
        daily_url: daily_url || "/checkin",
        daily_send_hour: typeof daily_send_hour === "number" ? daily_send_hour : 8,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error("웹 푸시 설정 저장 실패:", upsertError);
      return NextResponse.json({ error: "db_error", details: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
