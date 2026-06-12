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

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. FormData 파싱
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "no_files" }, { status: 400 });
    }

    // 파일 이름순으로 정렬
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    let mergedText = "";

    for (const file of sortedFiles) {
      // 00_ 등으로 시작하는 기획서/소개글은 제외 (필요 시)
      if (file.name.startsWith("00_")) {
        continue;
      }

      const fileContent = await file.text();
      const baseName = file.name.replace(/\.[^/.]+$/, ""); // 확장자 제거
      
      // 화수 헤더 추가
      mergedText += `\n\n[ ${baseName} ]\n\n`;
      mergedText += fileContent;
    }

    // 다운로드용 Response 반환
    return new Response(mergedText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="merged_novel.txt"`,
      },
    });
  } catch (error: any) {
    console.error("Merge chapters error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
