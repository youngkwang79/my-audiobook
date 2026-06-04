import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

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

    const userId = user.id;

    // 외래 키 제약 조건 방지를 위해 관련 데이터베이스 레코드들을 순차적으로 삭제
    
    // 1. 포인트 트랜잭션 기록 삭제
    await supabaseAdmin
      .from("point_transactions")
      .delete()
      .eq("user_id", userId);

    // 2. 완료한 미션 기록 삭제
    await supabaseAdmin
      .from("user_tasks")
      .delete()
      .eq("user_id", userId);

    // 3. 에피소드 대여/소유 정보 삭제
    await supabaseAdmin
      .from("entitlements")
      .delete()
      .eq("user_id", userId);

    // 4. 구독 정보 삭제
    await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);

    // 5. 지갑 삭제
    await supabaseAdmin
      .from("wallets")
      .delete()
      .eq("user_id", userId);

    // 6. Supabase Auth에서 최종 사용자 계정 삭제
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("[delete-account] auth delete error:", authDeleteError);
      return NextResponse.json({ error: "failed to delete auth account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[delete-account] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
