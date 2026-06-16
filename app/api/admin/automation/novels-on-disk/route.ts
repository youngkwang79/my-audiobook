import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. 디스크에서 무림북_ 폴더 목록 스캔
    const cwd = process.cwd();
    const items = fs.readdirSync(cwd);
    const folders = items.filter((item) => {
      const fullPath = path.join(cwd, item);
      if (!fs.statSync(fullPath).isDirectory()) return false;
      
      // 허용된 접두사나 이름
      if (item.startsWith("무림북_") || item.startsWith("무명 무협소설") || item.startsWith("무명지협")) {
        return true;
      }
      
      // 기획안 파일(json)이 들어있는 모든 폴더 허용
      const planFile = path.join(fullPath, "00_🚨급전개방지_작품기획안🚨.json");
      if (fs.existsSync(planFile)) {
        return true;
      }
      
      return false;
    }).map(folderName => {
      return {
        name: folderName,
        path: path.join(cwd, folderName)
      };
    });

    return NextResponse.json({ success: true, folders });
  } catch (error: any) {
    console.error("Failed to list novels on disk:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
