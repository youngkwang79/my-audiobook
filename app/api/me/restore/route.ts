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

    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("[restore] db error:", subError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    if (!sub) {
      return NextResponse.json({ success: false, message: "구독 내역이 없습니다." });
    }

    const now = new Date();
    const expiresAt = new Date(sub.expires_at);

    if (now > expiresAt) {
      return NextResponse.json({ success: false, message: "구독이 만료되었습니다." });
    }

    return NextResponse.json({ 
      success: true, 
      plan: sub.plan_type, 
      message: "정상적으로 구독이 복구되었습니다." 
    });

  } catch (error: any) {
    console.error("[restore] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
