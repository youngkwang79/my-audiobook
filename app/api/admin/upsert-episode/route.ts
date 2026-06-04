import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. Payload 파싱
    const payload = await req.json();
    if (!payload.work_id || !payload.id || !payload.title) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 3. Supabase Admin 클라이언트로 upsert 실행 (RLS 우회)
    const { data, error } = await supabaseAdmin
      .from("episodes")
      .upsert(payload)
      .select();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. 소설 테이블의 에피소드 수 업데이트
    const { data: currentEpList } = await supabaseAdmin
      .from("episodes")
      .select("id")
      .eq("work_id", payload.work_id);

    if (currentEpList) {
      await supabaseAdmin
        .from("works")
        .update({ episode_count: currentEpList.length })
        .eq("id", payload.work_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Upsert episode error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
