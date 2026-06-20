import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. Payload 파싱
    const payload = await req.json();
    if (!payload.id || !payload.title) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 3. 신규 등록(isNew=true)이면 upsert, 수정이면 update (episode_count는 자동 관리)
    const isNew = payload.isNew === true;
    // episode_count, isNew 플래그는 payload에서 제거 (episode_count는 에피소드 업로드 시 자동 관리)
    const { isNew: _isNew, episode_count: _epCount, ...updatePayload } = payload;

    let data, error;

    if (isNew) {
      // 신규 등록: upsert (episode_count 초기값 0 포함)
      const result = await supabaseAdmin
        .from("works")
        .upsert({ ...updatePayload, episode_count: 0 })
        .select();
      data = result.data;
      error = result.error;
    } else {
      // 수정: update (episode_count 건드리지 않음)
      const result = await supabaseAdmin
        .from("works")
        .update(updatePayload)
        .eq("id", payload.id)
        .select();
      data = result.data;
      error = result.error;

      // free_episodes가 포함된 경우 → 해당 작품의 에피소드 locked 상태 일괄 동기화
      if (!error && typeof updatePayload.free_episodes === "number") {
        const freeUntil = updatePayload.free_episodes;

        // 1~freeUntil 화: locked = false
        if (freeUntil > 0) {
          // 에피소드 id가 숫자인 것들 중 freeUntil 이하인 것들을 언락
          const { data: allEps } = await supabaseAdmin
            .from("episodes")
            .select("id")
            .eq("work_id", payload.id);

          if (allEps) {
            const freeIds = allEps
              .filter((ep: any) => {
                const n = parseFloat(ep.id);
                return Number.isFinite(n) && n <= freeUntil;
              })
              .map((ep: any) => ep.id);

            const lockedIds = allEps
              .filter((ep: any) => {
                const n = parseFloat(ep.id);
                return Number.isFinite(n) && n > freeUntil;
              })
              .map((ep: any) => ep.id);

            if (freeIds.length > 0) {
              await supabaseAdmin
                .from("episodes")
                .update({ locked: false })
                .eq("work_id", payload.id)
                .in("id", freeIds);
            }

            if (lockedIds.length > 0) {
              await supabaseAdmin
                .from("episodes")
                .update({ locked: true })
                .eq("work_id", payload.id)
                .in("id", lockedIds);
            }
          }
        }
      }
    }

    if (error) {
      console.error("Supabase upsert/update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Upsert novel error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
