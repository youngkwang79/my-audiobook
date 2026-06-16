import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const { tempDir, finalDir } = payload;

    if (!tempDir || !finalDir) {
      return NextResponse.json({ error: "missing_required_params" }, { status: 400 });
    }

    const tempDirPath = path.join(process.cwd(), tempDir);
    const finalDirPath = path.join(process.cwd(), finalDir);

    if (!fs.existsSync(tempDirPath)) {
      return NextResponse.json({ error: "temp_directory_not_found" }, { status: 404 });
    }

    if (fs.existsSync(finalDirPath)) {
      return NextResponse.json({ error: "final_directory_already_exists" }, { status: 400 });
    }

    fs.renameSync(tempDirPath, finalDirPath);

    return NextResponse.json({ success: true, finalDir });
  } catch (error: any) {
    console.error("Approve Plan API Error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
