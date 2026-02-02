"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { works } from "./data/works";

type LastPlayed = {
  episodeId: number;
  part: number;
  updatedAt?: number;
};

export default function Home() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loginHover, setLoginHover] = useState(false);

  // ✅ 이어듣기 정보
  const [lastPlayed, setLastPlayed] = useState<LastPlayed | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastPlayed");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.episodeId || !parsed?.part) return;

      setLastPlayed({
        episodeId: Number(parsed.episodeId),
        part: Number(parsed.part),
        updatedAt: parsed.updatedAt ? Number(parsed.updatedAt) : undefined,
      });
    } catch {
      // 무시
    }
  }, []);

  // ✅ 이어듣기 링크 (part 지원 여부와 무관하게 autoplay=1은 확실히 동작)
  const continueHref = useMemo(() => {
    if (!lastPlayed) return "";
    // part까지 URL로 넘기고 싶으면 에피소드 페이지에서 part 파라미터 처리 추가하면 됨
    // return `/episode/${lastPlayed.episodeId}?part=${lastPlayed.part}&autoplay=1`;
    return `/episode/${lastPlayed.episodeId}?autoplay=1`;
  }, [lastPlayed]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b12",
        color: "white",
        padding: 20,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      {/* 🔥 버튼 빛 효과 애니메이션 */}
      <style>{`
        @keyframes glowPulse {
          0% { box-shadow: 0 0 8px rgba(255,255,255,0.18); }
          50% { box-shadow: 0 0 22px rgba(255,255,255,0.35), 0 0 80px rgba(255,255,255,0.18); }
          100% { box-shadow: 0 0 8px rgba(255,255,255,0.18); }
        }

        @keyframes lightSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        /* ✅ 이어듣기 카드용 은은한 글로우 */
        @keyframes goldBreath {
          0% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
          50% { box-shadow: 0 0 26px rgba(255,215,120,0.35), 0 0 90px rgba(255,200,80,0.18); }
          100% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
        }
      `}</style>

      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 900 }}>무협 소설 채널</div>

        {/* ✅ 로그인 버튼도 금빛 + 호버 확장/빛 */}
        <button
          onMouseEnter={() => setLoginHover(true)}
          onMouseLeave={() => setLoginHover(false)}
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
            color: "#2b1d00",
            border: loginHover
              ? "1px solid rgba(255,215,120,0.95)"
              : "1px solid rgba(255,215,120,0.55)",
            padding: "10px 18px",
            borderRadius: 14,
            cursor: "pointer",
            fontSize: 30,
            fontWeight: 900,
            transform: loginHover ? "scale(1.06)" : "scale(1)",
            transition: "transform 180ms ease, box-shadow 180ms ease, border 180ms ease",
            boxShadow: loginHover
              ? "0 0 20px rgba(255,215,120,0.75), 0 0 80px rgba(255,200,80,0.45)"
              : "0 0 14px rgba(255,215,120,0.45), 0 0 50px rgba(255,200,80,0.25)",
          }}
        >
          로그인

          {/* 스윕 */}
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "60%",
              height: "100%",
              background:
                "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)",
              transform: "translateX(-120%)",
              animation: loginHover ? "lightSweep 0.9s ease forwards" : "none",
              pointerEvents: "none",
            }}
          />
        </button>
      </div>

      {/* ✅ 이어듣기 카드 (최근 시청 기록이 있을 때만 표시) */}
      {lastPlayed && (
        <div
          style={{
            maxWidth: 1200,
            borderRadius: 22,
            padding: 18,
            marginBottom: 18,
            border: "1px solid rgba(255,215,120,0.22)",
            background:
              "linear-gradient(135deg, rgba(255,241,168,0.10) 0%, rgba(243,201,105,0.06) 35%, rgba(212,162,60,0.05) 100%)",
            animation: "goldBreath 3.2s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>이어듣기</div>
            <div style={{ marginTop: 6, opacity: 0.9, fontSize: 16 }}>
              {lastPlayed.episodeId}화 · {lastPlayed.part}편부터 이어서 재생
            </div>
          </div>

          <Link href={continueHref} style={{ textDecoration: "none" }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                width: "fit-content",
                padding: "12px 20px",
                borderRadius: 999,
                fontWeight: 950,
                fontSize: 20,
                letterSpacing: "-0.3px",
                color: "#2b1d00",
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                border: "1px solid rgba(255,215,120,0.65)",
                boxShadow: "0 0 18px rgba(255,215,120,0.40)",
                cursor: "pointer",
              }}
            >
              ▶ 이어서 듣기
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "60%",
                  height: "100%",
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)",
                  transform: "translateX(-120%)",
                  animation: "lightSweep 1.2s ease infinite",
                  pointerEvents: "none",
                }}
              />
            </div>
          </Link>
        </div>
      )}

      {/* 작품 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 22,
          justifyItems: "start",
        }}
      >
        {works.map((work) => {
          const isHovered = hoveredId === work.id;

          return (
            <Link
              key={work.id}
              href={`/work/${work.id}`}
              style={{ textDecoration: "none", color: "inherit", width: "100%" }}
              onMouseEnter={() => setHoveredId(work.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: isHovered
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 26,
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "stretch",
                  maxWidth: 1200,
                  transform: isHovered ? "scale(1.01)" : "scale(1)",
                  transition: "transform 180ms ease, border 180ms ease",
                }}
              >
                {/* 썸네일 */}
                <div
                  style={{
                    width: 800,
                    height: 450,
                    position: "relative",
                    flexShrink: 0,
                    background: "rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* 🔥 썸네일 그라데이션 오버레이 */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.7) 100%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* 연재중 배지 */}
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      left: 16,
                      padding: "10px 14px",
                      borderRadius: 999,
                      fontSize: 18,
                      fontWeight: 900,
                      background: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      backdropFilter: "blur(6px)",
                      zIndex: 2,
                    }}
                  >
                    연재중
                  </div>

                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 14,
                      display: "block",
                    }}
                  />
                </div>

                {/* 정보 영역 */}
                <div
                  style={{
                    padding: 28,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      opacity: 0.9,
                      fontWeight: 700,
                      marginBottom: 30,
                    }}
                  >
                    총 {work.totalEpisodes}화 연재 중
                  </div>

                  {/* ✨ 금빛으로 빛나는 에피소드 보기 버튼 */}
                  <div
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      width: "fit-content",
                      padding: "14px 28px",
                      borderRadius: 22,
                      fontWeight: 950,
                      fontSize: 36,
                      letterSpacing: "-0.5px",
                      color: "#2b1d00",

                      background:
                        "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",

                      border: isHovered
                        ? "1px solid rgba(255,215,120,0.95)"
                        : "1px solid rgba(255,215,120,0.55)",

                      boxShadow: isHovered
                        ? "0 0 20px rgba(255,215,120,0.75), 0 0 80px rgba(255,200,80,0.45)"
                        : "0 0 14px rgba(255,215,120,0.45), 0 0 50px rgba(255,200,80,0.25)",

                      animation: isHovered ? "none" : "glowPulse 2.8s ease-in-out infinite",

                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      transition:
                        "transform 180ms ease, box-shadow 180ms ease, border 180ms ease",
                    }}
                  >
                    에피소드 보기

                    {/* 🌟 빛이 흐르는 스윕 효과 */}
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "60%",
                        height: "100%",
                        background:
                          "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)",
                        transform: "translateX(-120%)",
                        animation: isHovered ? "lightSweep 0.9s ease forwards" : "none",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
