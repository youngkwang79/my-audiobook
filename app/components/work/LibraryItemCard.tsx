"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Work } from "@/app/data/works";

type Props = {
  work: Work;
};

export default function LibraryItemCard({ work }: Props) {
  const [watchedEpisode, setWatchedEpisode] = useState<string>("1");

  useEffect(() => {
    try {
      const progressRaw = localStorage.getItem("workProgress");
      if (progressRaw) {
        const progress = JSON.parse(progressRaw);
        if (progress[work.id]) {
          setWatchedEpisode(String(progress[work.id]));
          return;
        }
      }
      // 아직 본 기록이 없고 에피소드가 아예 없으면 (준비중 등) 0화로 설정
      if (work.episodeCount === 0) {
        setWatchedEpisode("0");
      } else {
        setWatchedEpisode("1");
      }
    } catch (e) {
      console.error(e);
    }
  }, [work.id, work.episodeCount]);

  const watchedEpisodeNum = parseInt(watchedEpisode.split("-")[0], 10) || 0;

  const progressPercent =
    work.totalEpisodes > 0
      ? Math.min(100, Math.round((watchedEpisodeNum / work.totalEpisodes) * 100))
      : 0;

  // 서브타이틀에서 괄호([])를 제거하거나 쉼표(,)로 변환할 수도 있지만,
  // 시안에는 "재결합, 싱글맘, 로맨스" 형태로 되어 있으므로,
  // 만약 "[성장] [복수]" 라면 "성장, 복수"로 변환해서 보여줍니다.
  const formatSubtitle = (subtitle?: string) => {
    if (!subtitle) return "";
    return subtitle
      .replace(/\[/g, "")
      .replace(/\]\s*/g, ", ")
      .replace(/,\s*$/, ""); // 마지막 쉼표 제거
  };

  return (
    <>
      <style>{`
        .library-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 0;
          text-decoration: none;
          color: inherit;
        }

        .lib-thumb-wrap {
          position: relative;
          width: 80px;
          aspect-ratio: 3 / 4;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
          background: #1c1c24;
        }

        .lib-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lib-progress-bg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
        }

        .lib-progress-bar {
          height: 100%;
          background: #ff2a5f; /* 핑크색 진행바 */
        }

        .lib-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: hidden;
        }

        .lib-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lib-subtitle {
          font-size: 13px;
          color: #8c8c96;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lib-progress-text {
          font-size: 13px;
          color: #8c8c96;
          margin: 0;
          margin-top: 4px;
        }
      `}</style>

      <Link href={`/episode/${work.id}/${watchedEpisode}?part=1`} className="library-item">
        <div className="lib-thumb-wrap">
          <img src={work.thumbnail} alt={work.title} className="lib-thumb" loading="lazy" />
          <div className="lib-progress-bg">
            <div className="lib-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="lib-info">
          <h3 className="lib-title">{work.title}</h3>
          <p className="lib-subtitle">{formatSubtitle(work.subtitle || work.status)}</p>
          <p className="lib-progress-text">
            {watchedEpisode}화 / {work.totalEpisodes}화
          </p>
        </div>
      </Link>
    </>
  );
}
