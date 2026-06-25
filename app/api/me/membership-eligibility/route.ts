import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Validate admin
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = userRole === "admin" || hasAdminEmail;

    // 1. Annual eligibility (7 days from creation)
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    const eligibleForAnnualPromo = daysSinceCreation <= 7 || isAdmin;

    // 2. Weekly eligibility (no previous successful weekly order)
    const { data: weeklyOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_name", "주간 멤버십 서비스")
      .eq("status", "SUCCESS")
      .limit(1);
    
    const eligibleForWeeklyPromo = !weeklyOrders || weeklyOrders.length === 0 || isAdmin;

    // 2.5) Monthly eligibility (no previous successful monthly order)
    const { data: monthlyOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_name", "월간 멤버십 서비스")
      .eq("status", "SUCCESS")
      .limit(1);
    
    const eligibleForMonthlyPromo = !monthlyOrders || monthlyOrders.length === 0 || isAdmin;

    // 3. Welcome gift check (has received 3500 coins?)
    const { data: welcomeTx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("description", "회원가입 축하 선물")
      .limit(1);

    const hasReceivedWelcome = welcomeTx && welcomeTx.length > 0;

    return NextResponse.json({
      eligibleForAnnualPromo,
      eligibleForWeeklyPromo,
      eligibleForMonthlyPromo,
      hasReceivedWelcome,
      annualPrice: eligibleForAnnualPromo ? 29900 : 99900,
      weeklyPrice: eligibleForWeeklyPromo ? 1000 : 3000,
      monthlyPrice: eligibleForMonthlyPromo ? 1900 : 4900,
      daysSinceCreation
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
