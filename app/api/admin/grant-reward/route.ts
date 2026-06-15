import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Validate admin
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    if (userRole !== "admin" && !hasAdminEmail) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { userId, amount, reason } = await req.json();

    if (!userId || !amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }

    const reward = Number(amount);

    // Get current user wallet
    let { data: wallet, error: walletErr } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletErr && walletErr.code === "PGRST116") {
      // Wallet not found, create one
      const { data: newWallet, error: createErr } = await supabaseAdmin
        .from("wallets")
        .insert({ user_id: userId, points: 0, reward_points: 0 })
        .select()
        .single();
      if (createErr) throw createErr;
      wallet = newWallet;
    } else if (walletErr) {
      throw walletErr;
    }

    const newRewardPoints = (wallet.reward_points || 0) + reward;
    
    // Update wallet
    const { error: updateErr } = await supabaseAdmin
      .from("wallets")
      .update({ reward_points: newRewardPoints, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateErr) throw updateErr;

    // Optional: Log it in point_transactions table (if exists) or user_tasks
    try {
      await supabaseAdmin
        .from("point_transactions")
        .insert({
          user_id: userId,
          amount: reward,
          type: "EARN",
          description: reason || "관리자 보상 지급"
        });
    } catch(e) {} // ignore error if table doesn't exist

    return NextResponse.json({ success: true, rewardPoints: newRewardPoints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
