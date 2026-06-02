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

    const { plan } = await req.json();
    if (!plan || (plan !== "weekly" && plan !== "annual" && plan !== "yearly")) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }

    const daysToAdd = plan === "weekly" ? 7 : 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    const { error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan_type: plan,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("[subscribe] db error:", upsertError);
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (error: any) {
    console.error("[subscribe] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
