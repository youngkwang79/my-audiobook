"use client";

import Link from "next/link";
import type { Work } from "@/app/data/works";
import { getEpisodesByWork } from "@/app/data/episodes";

type Props = {
  work: Work & { firstEpisodeId?: string | null };
};

export default function WorkPosterCard({ work }: Props) {
  // Use firstEpisodeId from database if available, otherwise fall back to static data
  let firstEpId = work.firstEpisodeId;
  if (firstEpId === undefined) {
    const episodes = getEpisodesByWork(work.id);
    firstEpId = episodes[0]?.id || null;
  }

  const playHref = firstEpId
    ? `/episode/${work.id}/${firstEpId}?part=1&autoplay=1`
    : `/work/${work.id}`;

  // 배지 색상 결정
  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case "인기":
        return {
          background: "#ff2a5f",
          color: "#ffffff",
        };
      case "신작":
        return {
          background: "#535cff",
          color: "#ffffff",
        };
      case "독점":
        return {
          background: "linear-gradient(135deg, #ffd700 0%, #d4a23c 100%)",
          color: "#2b1d00",
          fontWeight: 900,
        };
      default:
        return {
          background: "rgba(0, 0, 0, 0.7)",
          color: "#ffffff",
        };
    }
  };

  return (
    <Link href={playHref} className="poster-card">
      <div className="poster-thumb-wrap">
        {/* 배지 */}
        {work.badge && (
          <div className="poster-badge" style={getBadgeStyle(work.badge)}>
            {work.badge}
          </div>
        )}


        {/* 준비중 오버레이 */}
        {work.status === "준비중" && (
          <div className="coming-soon-overlay">
            <span className="coming-soon-text">준비중</span>
          </div>
        )}

        {/* 재생 뷰 카운터 */}
        {work.views && (
          <div className="views-overlay">
            <span>▶</span> {work.views}
          </div>
        )}

        <img
          src={work.thumbnail}
          alt={work.title}
          className="poster-img"
          loading="lazy"
        />
      </div>

      <div className="poster-info">
        <h3 className="poster-title">{work.title}</h3>
        <p className="poster-subtitle">{work.subtitle || work.status}</p>
      </div>
    </Link>
  );
}
