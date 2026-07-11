import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// SSR 호환을 위해 순수 supabase-js 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);


export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = "https://www.murimbook.com";

  try {
    // 1. Supabase에서 모든 작품(works) 리스트 가져오기
    const { data: works, error } = await supabase
      .from("works")
      .select("id, title, description, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // 2. 비공개 또는 예약 발행 대기 중인 작품 필터링
    const activeWorks = (works || []).filter((work) => {
      if (work.status === "준비중") return false;
      if (work.status === "공개예정" && work.created_at && new Date(work.created_at).getTime() > Date.now()) {
        return false;
      }
      return true;
    });

    // 3. XML 형식으로 RSS 피드 데이터 조립
    let rssItemsXml = "";
    activeWorks.forEach((work) => {
      const title = escapeXml(work.title || "무제");
      const description = escapeXml(work.description || "");
      const link = `${baseUrl}/work/${encodeURIComponent(work.id)}`;
      const pubDate = work.created_at ? new Date(work.created_at).toUTCString() : new Date().toUTCString();

      rssItemsXml += `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    });

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>무림북 (Moorim Book)</title>
    <link>${baseUrl}</link>
    <description>무협 소설 및 오디오북 전문 플랫폼</description>
    <language>ko-kr</language>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml" />
    ${rssItemsXml}
  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// XML 특수 문자 탈출(escape) 함수
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
