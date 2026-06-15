import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncAndGetWallet } from "@/lib/server/walletHelper";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Check if already received
    const { data: welcomeTx } = await supabaseAdmin
      .from("point_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("description", "회원가입 축하 선물")
      .limit(1);

    if (welcomeTx && welcomeTx.length > 0) {
      return NextResponse.json({ error: "이미 가입 축하 선물을 받으셨습니다!" }, { status: 400 });
    }

    const amount = 3500;

    // 1. Get or create wallet securely
    const wallet = await syncAndGetWallet(user.id, user.created_at);

    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .upsert({
        user_id: user.id,
        points: wallet.points,
        reward_points: wallet.reward_points + amount,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (updateError) throw updateError;

    // 2. Insert transaction
    const { error: txError } = await supabaseAdmin
      .from("point_transactions")
      .insert({
        user_id: user.id,
        amount: amount,
        transaction_type: "reward",
        description: "회원가입 축하 선물",
      });

    if (txError) throw txError;

    return NextResponse.json({ success: true, amount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
