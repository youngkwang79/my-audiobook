import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth getUser error in wallet transactions API:", authError);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // 'charge', 'reward', 'use'

    let query = supabaseAdmin
      .from("point_transactions")
      .select("id, amount, transaction_type, description, created_at")
      .eq("user_id", user_id);

    if (type) {
      query = query.eq("transaction_type", type);
    }

    const { data: transactions, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Failed to fetch wallet transactions:", error);
      return NextResponse.json(
        { error: "transactions_query_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: transactions ?? [] });
  } catch (error) {
    console.error("Wallet transactions route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
