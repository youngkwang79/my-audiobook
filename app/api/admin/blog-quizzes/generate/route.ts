import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1. 권한 인증
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const hasAdminEmail =
      user.email === "youngkwang79@gmail.com" ||
      user.email === "youngkwang7979@gmail.com" ||
      user.email === "admin@murimbook.com";
    if (!hasAdminEmail && user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { url } = await req.json().catch(() => ({}));
    if (!url || !url.trim()) {
      return NextResponse.json({ error: "missing_url" }, { status: 400 });
    }

    // 2. URL 본문 크롤링
    let targetUrl = url.trim();
    
    // 네이버 블로그 아이프레임 대응
    if (targetUrl.includes("blog.naver.com")) {
      const match = targetUrl.match(/blog\.naver\.com\/([a-zA-Z0-9_\-]+)\/(\d+)/);
      if (match) {
        const [_, blogId, logNo] = match;
        targetUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
      }
    }

    console.log(`Crawling URL: ${targetUrl}`);
    const fetchRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!fetchRes.ok) {
      return NextResponse.json({ error: `failed_to_fetch_url`, status: fetchRes.status }, { status: 400 });
    }

    const html = await fetchRes.text();

    // 제목 추출 (<title> 태그)
    let title = "";
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    // 네이버 블로그 등의 타이틀 기본 후처리
    title = title.replace(/\s*:\s*네이버\s*블로그/i, "").trim();

    // HTML 태그 정제
    let cleanText = html
      .replace(/<(script|style|header|footer|nav|aside)[^>]*>([\s\S]*?)<\/\1>/gi, "") // 불필요 태그 및 내부 내용 삭제
      .replace(/<\/?[^>]+(>|$)/g, " ") // 모든 HTML 태그 공백으로 치환
      .replace(/\s+/g, " ") // 연속된 공백 하나로 축소
      .trim();

    // HTML 엔티티 치환
    cleanText = cleanText
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 너무 길면 요약 효율을 위해 최대 6000자 제한
    if (cleanText.length > 6000) {
      cleanText = cleanText.substring(0, 6000);
    }

    if (!cleanText) {
      return NextResponse.json({ error: "no_readable_text" }, { status: 400 });
    }

    // 3. Gemini 호출하여 퀴즈 생성
    const apiKey = process.env.GOOGLE_PAID_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "missing_google_api_key_on_server" }, { status: 500 });
    }

    const systemPrompt = `You are a professional quiz generator. Create multiple-choice quiz sets (each set contains exactly two questions: q1 and q2) in Korean based on the provided blog post.
The output MUST be a valid JSON array matching the requested schema.`;

    const userPrompt = `Blog Title: ${title}
Blog Post Content:
${cleanText}`;

    console.log("Calling Gemini 1.5 Flash for quiz generation...");
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q1_question: { type: "STRING" },
                q1_options: { 
                  type: "ARRAY", 
                  items: { type: "STRING" }
                },
                q1_answer: { type: "INTEGER" },
                q2_question: { type: "STRING" },
                q2_options: { 
                  type: "ARRAY", 
                  items: { type: "STRING" }
                },
                q2_answer: { type: "INTEGER" }
              },
              required: ["q1_question", "q1_options", "q1_answer", "q2_question", "q2_options", "q2_answer"]
            }
          }
        }
      })
    });

    if (!geminiRes.ok) {
      const errDetail = await geminiRes.text();
      console.error("Gemini API call failed:", errDetail);
      return NextResponse.json({ error: "gemini_api_failed", details: errDetail }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const contentString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    let quizPairs: any[] = [];
    try {
      quizPairs = JSON.parse(contentString);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", contentString);
      return NextResponse.json({ error: "json_parse_failed", raw: contentString }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      title: title || "블로그 포스트",
      quizPairs
    });

  } catch (error: any) {
    console.error("Blog quiz generate API error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
