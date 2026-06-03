import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const revalidate = 0; // Disable server-side response caching for this API

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_visits")
      .select("page_path")
      .eq("visit_date", "2000-01-01");

    if (error) {
      console.error("Failed to fetch play counts:", error);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    
    // Group and count unique plays by workId in memory
    if (data) {
      for (const row of data) {
        if (row.page_path && row.page_path.startsWith("play:")) {
          const workId = row.page_path.substring("play:".length);
          counts[workId] = (counts[workId] || 0) + 1;
        }
      }
    }

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error("Play counts API error:", error);
    return NextResponse.json({ error: "server_error", detail: error.message }, { status: 500 });
  }
}
