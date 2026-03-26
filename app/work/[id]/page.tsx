"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { works } from "@/app/data/works";
import { getEpisodesByWork } from "@/app/data/episodes";

export default function WorkDetailPage() {
  const params = useParams();
  const workId = String(params.id);

  const work = works.find((w) => w.id === workId);
  const episodes = getEpisodesByWork(workId);

  if (!work) {
    return (
      <main style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 20 }}>
        <TopBar />
        <h1>존재하지 않는 작품입니다.</h1>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 20 }}>
      <TopBar />
      <h1>{work.title}</h1>
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {episodes.map((ep, index) => (
  <Link
    key={`${ep.id}-${index}`}
            href={`/episode/${workId}/${ep.id}?part=1`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 14,
              }}
            >
              {ep.id}화 - {ep.title}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}