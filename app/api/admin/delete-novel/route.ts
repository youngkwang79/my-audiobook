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
    const payload = await req.json().catch(() => ({}));
    const { id } = payload;

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    // 3. 외래 키 제약 조건 순서대로 삭제 (entitlements -> episodes -> works)
    // 3-1. 소설과 관련된 에피소드 구매 해제 내역 삭제
    const { error: entErr } = await supabaseAdmin
      .from("entitlements")
      .delete()
      .eq("work_id", id);

    if (entErr) {
      console.error("Error deleting entitlements:", entErr);
      return NextResponse.json({ error: entErr.message }, { status: 500 });
    }

    // 3-2. 소설의 에피소드 목록 삭제
    const { error: epErr } = await supabaseAdmin
      .from("episodes")
      .delete()
      .eq("work_id", id);

    if (epErr) {
      console.error("Error deleting episodes:", epErr);
      return NextResponse.json({ error: epErr.message }, { status: 500 });
    }

    // 3-3. 소설 작품 정보 삭제
    const { error: workErr } = await supabaseAdmin
      .from("works")
      .delete()
      .eq("id", id);

    if (workErr) {
      console.error("Error deleting work:", workErr);
      return NextResponse.json({ error: workErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete novel API error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
