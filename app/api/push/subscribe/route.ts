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

    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // subscription 정보를 public.web_push_subscriptions 테이블에 업서트(중복 삽입 방지)
    const { error: dbError } = await supabaseAdmin
      .from("web_push_subscriptions")
      .insert({
        user_id: user.id,
        subscription: subscription
      });

    if (dbError) {
      // 만약 이미 유니크 인덱스로 인해 걸렸다면 23505 에러가 나지만 정상으로 넘겨줍니다.
      if (dbError.code === "23505") {
        return NextResponse.json({ success: true, message: "already_subscribed" });
      }
      console.error("웹 푸시 저장 DB 에러:", dbError);
      return NextResponse.json({ error: "db_error", details: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("웹 푸시 구독 저장 중 서버 에러:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
