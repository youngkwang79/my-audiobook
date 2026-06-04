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

    // subscriptions 테이블에서 유저 구독 정보 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[unsubscribe] db error:", deleteError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[unsubscribe] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
