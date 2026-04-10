import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const { count: todayCount, error: todayError } = await supabaseAdmin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("visit_date", today);

    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from("site_visits")
      .select("*", { count: "exact", head: true });

    if (todayError || totalError) {
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({
      today: todayCount ?? 0,
      total: totalCount ?? 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}