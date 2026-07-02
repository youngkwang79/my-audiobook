import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.murimbook.com";

  // 기본 정적 페이지 목록
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/checkin`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  try {
    // 1. Supabase에서 모든 작품(works) 리스트 가져오기
    const { data: works } = await supabase
      .from("works")
      .select("id, updated_at")
      .order("created_at", { ascending: false });

    const workUrls = (works || []).map((work) => ({
      url: `${baseUrl}/work/${encodeURIComponent(work.id)}`,
      lastModified: work.updated_at ? new Date(work.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // 2. 모든 에피소드(episodes) 리스트 가져오기
    const { data: episodes } = await supabase
      .from("episodes")
      .select("work_id, id, release_date")
      .lte("release_date", new Date().toISOString());

    const episodeUrls = (episodes || []).map((ep) => ({
      url: `${baseUrl}/episode/${encodeURIComponent(ep.work_id)}/${encodeURIComponent(ep.id)}`,
      lastModified: ep.release_date ? new Date(ep.release_date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    return [...staticPages, ...workUrls, ...episodeUrls];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
