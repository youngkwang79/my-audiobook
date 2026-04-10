import Link from "next/link";
import type { Work } from "@/app/data/works";

type Props = {
  work: Work;
};

export default function WorkCard({ work }: Props) {
  return (
    <>
      <style>{`
        .work-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          flex-direction: column;

          /* 배경 거의 없음 */
          background: rgba(255, 255, 255, 0.015);

          /* iPhone 차이 줄이려고 블러 제거 */
          backdrop-filter: none;
          -webkit-backdrop-filter: none;

          border: 1px solid rgba(255, 215, 120, 0.12);
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.14),
            0 0 6px rgba(255, 215, 120, 0.04);

          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .work-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 215, 120, 0.18);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.18),
            0 0 10px rgba(255, 215, 120, 0.06);
        }

        .work-card-thumb-wrap {
          position: relative;
          width: 100%;
          flex-shrink: 0;
          overflow: hidden;

          /* 썸네일 뒤 배경도 거의 없음 */
          background: rgba(255, 255, 255, 0.01);
        }

        .work-card-thumb {
          width: 100%;
          display: block;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          opacity: 1;
          filter: none;
        }

        /* 썸네일 위 덮는 막도 거의 제거 */
        .work-card-thumb-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.01) 0%,
              rgba(0, 0, 0, 0.02) 60%,
              rgba(0, 0, 0, 0.04) 100%
            );
        }

        .work-card-body {
          position: relative;
          padding: 18px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 10px;

          /* 본문 배경도 아주 약하게 */
          background: rgba(7, 10, 22, 0.06);

          backdrop-filter: none;
          -webkit-backdrop-filter: none;

          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }

        .work-card-title {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          line-height: 1.25;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.96);
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        }

        .work-card-desc {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.6;
          margin: 0;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.82);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        }

        .work-card-meta {
          font-size: 15px;
          font-weight: 800;
          margin: 0;
          color: rgba(255, 245, 210, 0.88);
        }

        .work-card-btn {
          margin-top: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 140px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f6e7a1, #c9a94d);
          color: #1d1607;
          font-size: 17px;
          font-weight: 900;
          text-decoration: none;
          box-shadow:
            0 0 8px rgba(255, 215, 120, 0.08),
            0 4px 10px rgba(0, 0, 0, 0.12);
        }

        @media (max-width: 768px) {
          .work-card {
            background: rgba(255, 255, 255, 0.012);
            border: 1px solid rgba(255, 215, 120, 0.10);
            box-shadow:
              0 5px 14px rgba(0, 0, 0, 0.12),
              0 0 4px rgba(255, 215, 120, 0.03);
          }

          .work-card-thumb-wrap {
            background: rgba(255, 255, 255, 0.008);
          }

          .work-card-thumb-wrap::after {
            background:
              linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.008) 0%,
                rgba(0, 0, 0, 0.015) 60%,
                rgba(0, 0, 0, 0.03) 100%
              );
          }

          .work-card-body {
            background: rgba(7, 10, 22, 0.045);
          }
        }

        @media (min-width: 900px) {
          .work-card {
            display: grid;
            grid-template-columns: 320px 1fr;
            align-items: stretch;
            min-height: 240px;
          }

          .work-card-thumb-wrap {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .work-card-thumb {
            width: 100%;
            height: 100%;
            aspect-ratio: auto;
            object-fit: contain;
            background: transparent;
          }

          .work-card-body {
            padding: 26px 28px;
            justify-content: center;
            gap: 14px;
            border-top: 0;
            border-left: 1px solid rgba(255, 255, 255, 0.03);
          }

          .work-card-title {
            font-size: 34px;
          }

          .work-card-desc {
            font-size: 21px;
            line-height: 1.55;
            max-width: 760px;
          }

          .work-card-meta {
            font-size: 18px;
          }

          .work-card-btn {
            width: 150px;
            max-width: none;
            height: 50px;
            font-size: 18px;
          }
        }
      `}</style>

      <div className="work-card">
        <div className="work-card-thumb-wrap">
          <img
            src={work.thumbnail}
            alt={work.title}
            className="work-card-thumb"
          />
        </div>

        <div className="work-card-body">
          <h2 className="work-card-title">{work.title}</h2>

          <p className="work-card-desc">{work.description}</p>

          <p className="work-card-meta">
            총 {work.episodeCount}화 · {work.status}
          </p>

          <Link href={`/work/${work.id}`} className="work-card-btn">
            작품 보기
          </Link>
        </div>
      </div>
    </>
  );
}