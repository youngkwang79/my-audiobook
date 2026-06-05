"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Work } from "@/app/data/works";
import { getEpisodesByWork } from "@/app/data/episodes";

type Props = {
  work: Work & { firstEpisodeId?: string | null };
};

export default function WorkPosterCard({ work }: Props) {
  // 이어듣기 href: localStorage에서 복원
  const [resumeHref, setResumeHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 1. workProgress: 이 작품에서 마지막으로 본 에피소드
      const progressRaw = localStorage.getItem("workProgress");
      const progress = progressRaw ? JSON.parse(progressRaw) : {};
      const lastEpisode: string | undefined = progress[work.id];

      if (lastEpisode) {
        // 2. lastPlayed에서 part까지 복원
        const lastPlayedRaw = localStorage.getItem("lastPlayed");
        if (lastPlayedRaw) {
          const lastPlayed = JSON.parse(lastPlayedRaw);
          if (lastPlayed.workId === work.id && String(lastPlayed.episodeId) === String(lastEpisode)) {
            const part = lastPlayed.part ?? 1;
            setResumeHref(`/episode/${work.id}/${lastEpisode}?part=${part}&autoplay=1`);
            return;
          }
        }
        setResumeHref(`/episode/${work.id}/${lastEpisode}?part=1&autoplay=1`);
      }
    } catch (e) {
      // 무시
    }
  }, [work.id]);

  // 첫 에피소드 링크 (본 기록 없을 때)
  let firstEpId = work.firstEpisodeId;
  if (firstEpId === undefined) {
    const episodes = getEpisodesByWork(work.id);
    firstEpId = episodes[0]?.id || null;
  }

  const playHref = resumeHref
    ?? (firstEpId ? `/episode/${work.id}/${firstEpId}?part=1&autoplay=1` : `/work/${work.id}`);

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

        {/* 이어듣기 표시 */}
        {resumeHref && (
          <div style={{
            position: "absolute",
            bottom: 22,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 4,
          }}>
            <span style={{
              background: "rgba(0,0,0,0.7)",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: 99,
              letterSpacing: "-0.2px",
            }}>▶ 이어듣기</span>
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
