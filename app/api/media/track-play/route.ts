import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { workId } = await req.json();

    if (!workId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // works 테이블의 play_count를 1씩 누적 (RPC 또는 rpc increment)
    // Supabase에 rpc("increment_play_count") 없이 직접 UPDATE로 처리
    const { error } = await supabaseAdmin.rpc("increment_play_count", {
      work_id_input: workId,
    });

    if (error) {
      // RPC가 없을 경우 폴백: 수동 select + update
      const { data: work, error: fetchErr } = await supabaseAdmin
        .from("works")
        .select("play_count")
        .eq("id", workId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Play count fetch error:", fetchErr);
        return NextResponse.json({ error: "db_error", detail: fetchErr.message }, { status: 500 });
      }

      const current = Number(work?.play_count ?? 0);
      const { error: updateErr } = await supabaseAdmin
        .from("works")
        .update({ play_count: current + 1 })
        .eq("id", workId);

      if (updateErr) {
        console.error("Play count update error:", updateErr);
        return NextResponse.json({ error: "db_error", detail: updateErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Play track server error:", error);
    return NextResponse.json({ error: "server_error", detail: error.message }, { status: 500 });
  }
}
