import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { workId } = await req.json();

    if (!workId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    let user = null;
    if (token && token !== "null") {
      try {
        const { data } = await supabaseAdmin.auth.getUser(token);
        user = data?.user || null;
      } catch (err) {
        // Auth token lookup failed, treat as guest
        console.warn("Auth token lookup failed in track-play:", err);
      }
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get("visitor_id")?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    const visitor_key = user ? `user:${user.id}` : `guest:${visitorId}`;
    const user_id = user?.id ?? null;
    const testDate = "2000-01-01";
    const page_path = `play:${workId}`;

    // Check if unique play record already exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from("site_visits")
      .select("id")
      .eq("visit_date", testDate)
      .eq("page_path", page_path)
      .eq("visitor_key", visitor_key)
      .maybeSingle();

    if (findError) {
      console.error("Play track find error:", findError);
      return NextResponse.json({ error: "db_error", detail: findError.message }, { status: 500 });
    }

    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from("site_visits")
        .insert({
          visit_date: testDate,
          page_path,
          visitor_key,
          user_id
        });

      if (insertError) {
        console.error("Play track insert error:", insertError);
        return NextResponse.json({ error: "db_error", detail: insertError.message }, { status: 500 });
      }
    }

    const res = NextResponse.json({ ok: true, alreadyTracked: !!existing });

    if (!cookieStore.get("visitor_id")) {
      res.cookies.set("visitor_id", visitorId, {
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (error: any) {
    console.error("Play track server error:", error);
    return NextResponse.json({ error: "server_error", detail: error.message }, { status: 500 });
  }
}
