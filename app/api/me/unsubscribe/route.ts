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

    // 1. subscriptions 테이블에서 유저 구독 정보 조회하여 빌링키 획득
    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("[unsubscribe] db select error:", subError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    if (sub && sub.billing_key) {
      // 2. 포트원 V2 빌링키 삭제 API 호출
      const portoneApiSecret = process.env.PORTONE_API_SECRET;
      if (portoneApiSecret) {
        try {
          const deleteRes = await fetch(`https://api.portone.io/billing-keys/${encodeURIComponent(sub.billing_key)}`, {
            method: "DELETE",
            headers: {
              Authorization: `PortOne ${portoneApiSecret}`,
            },
          });
          if (!deleteRes.ok) {
            const errText = await deleteRes.text();
            console.error("[unsubscribe] PortOne billing key delete failed:", deleteRes.status, errText);
          } else {
            console.log("[unsubscribe] PortOne billing key deleted successfully:", sub.billing_key);
          }
        } catch (e) {
          console.error("[unsubscribe] PortOne delete request exception:", e);
        }
      }
    }

    // 3. subscriptions 테이블에서 유저 구독 정보 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[unsubscribe] db delete error:", deleteError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[unsubscribe] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
