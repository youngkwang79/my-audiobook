import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { nickname } = await req.json().catch(() => ({}));
    
    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: "닉네임을 입력해 주세요." }, { status: 400 });
    }

    const cleanNickname = nickname.trim();

    let matchedEmail: string | null = null;
    let page = 1;
    const perPage = 1000;

    // Loop through users to find the one matching the nickname in user_metadata
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        throw error;
      }

      if (!users || users.length === 0) {
        break;
      }

      const match = users.find(u => u.user_metadata?.nickname === cleanNickname);
      if (match) {
        matchedEmail = match.email || null;
        break;
      }

      if (users.length < perPage) {
        break;
      }
      page++;
    }

    if (matchedEmail) {
      // Mask email for privacy (e.g. yo***@gmail.com)
      const parts = matchedEmail.split("@");
      const local = parts[0];
      const domain = parts[1];
      const maskedLocal = local.length > 2 
        ? local.slice(0, 2) + "*".repeat(local.length - 2) 
        : local + "*";
      
      return NextResponse.json({ 
        success: true, 
        email: `${maskedLocal}@${domain}` 
      });
    } else {
      return NextResponse.json({ error: "해당 닉네임으로 가입된 이메일을 찾을 수 없습니다." }, { status: 404 });
    }

  } catch (error: any) {
    console.error("Find email error:", error);
    return NextResponse.json({ error: "이메일 찾기 중 오류가 발생했습니다." }, { status: 500 });
  }
}
