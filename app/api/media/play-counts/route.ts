import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("works")
      .select("id, play_count");

    if (error) {
      console.error("Failed to fetch play counts:", error);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    if (data) {
      for (const row of data) {
        if (row.id) {
          counts[row.id] = Number(row.play_count ?? 0);
        }
      }
    }

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error("Play counts API error:", error);
    return NextResponse.json({ error: "server_error", detail: error.message }, { status: 500 });
  }
}
