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

          background:
            linear-gradient(
              135deg,
              rgba(7, 10, 22, 0.0028) 0%,
              rgba(8, 11, 24, 0.0022) 45%,
              rgba(10, 13, 26, 0.0006) 100%
            );

          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(10px);

          border: 1px solid rgba(255, 215, 120, 0.16);

          box-shadow:
            0 0 8px rgba(255, 215, 120, 0.08),
            0 8px 22px rgba(0, 0, 0, 0.18);
        }

        .work-card-thumb-wrap {
          position: relative;
          width: 100%;
          flex-shrink: 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
        }

        .work-card-thumb {
          width: 100%;
          display: block;
          aspect-ratio: 16 / 9;
          object-fit: cover;
        }

        .work-card-thumb-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.02) 0%,
              rgba(0, 0, 0, 0.0004) 55%,
              rgba(0, 0, 0, 0.0010) 100%
            );
        }

        .work-card-body {
          position: relative;
          padding: 18px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 10px;

          background:
            linear-gradient(
              180deg,
              rgba(7, 10, 22, 0.36) 0%,
              rgba(7, 10, 22, 0.24) 100%
            );

          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);

          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .work-card-title {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          line-height: 1.25;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.96);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
        }

        .work-card-desc {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.6;
          opacity: 1;
          margin: 0;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.82);
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.18);
        }

        .work-card-meta {
          font-size: 15px;
          font-weight: 800;
          opacity: 1;
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
            0 0 8px rgba(255, 215, 120, 0.10),
            0 4px 12px rgba(0, 0, 0, 0.14);
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
            background: rgba(255, 255, 255, 0.015);
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
            border-left: 1px solid rgba(255, 255, 255, 0.04);
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