"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { works } from "./data/works";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

type LastPlayed = {
  episodeId: number;
  part: number;
  updatedAt?: number;
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

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

  // ✅ 이어듣기 링크
  const continueHref = useMemo(() => {
    if (!lastPlayed) return "";
    return `/episode/${lastPlayed.episodeId}?autoplay=1`;
  }, [lastPlayed]);

  // ✅ 로그인 필요 액션(비로그인 -> /login)
  const goIfLoggedIn = (href: string) => {
    if (!href) return;
    if (!user) {
      router.push("/login");
      return;
    }
    router.push(href);
  };

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
      {/* ✅ 애니메이션 + ✅ 모바일 반응형(안짤리게 핵심) */}
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
        @keyframes goldBreath {
          0% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
          50% { box-shadow: 0 0 26px rgba(255,215,120,0.35), 0 0 90px rgba(255,200,80,0.18); }
          100% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
        }

        /* ✅ 카드 레이아웃 클래스 */
        .workCard {
          background: rgba(255,255,255,0.06);
          border-radius: 26px;
          overflow: hidden;
          display: flex;
          align-items: stretch;
          max-width: 1200px;
          transition: transform 180ms ease, border 180ms ease;
        }

        /* ✅ 썸네일 영역: 데스크탑 기본 */
        .thumbWrap {
          width: 800px;
          height: 450px;
          position: relative;
          flex-shrink: 0;
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ✅ 이미지: contain 유지하면서도 '안 잘리게' */
        .thumbImg {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 14px;
          display: block;
        }

        /* ✅ 모바일에서 안 잘리게 핵심:
           - 카드가 세로로 쌓임
           - 썸네일이 화면폭 100%를 따라감
           - 높이는 자동(비율 유지) */
        @media (max-width: 900px) {
          .topBar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .titleText {
            font-size: 32px !important;
          }

          .loginBtn {
            font-size: 22px !important;
            padding: 10px 16px !important;
            border-radius: 14px !important;
          }

          .workCard {
            flex-direction: column;
            width: 100%;
          }

          .thumbWrap {
            width: 100%;
            height: auto;
            aspect-ratio: 16 / 9; /* 화면에 맞춰 비율 유지 */
          }

          .infoArea {
            padding: 18px !important;
          }

          .infoText {
            font-size: 20px !important;
            margin-bottom: 16px !important;
          }

          .episodeBtn {
            font-size: 24px !important;
            padding: 12px 20px !important;
            border-radius: 18px !important;
          }

          /* 이어듣기 카드도 모바일에서 줄바꿈 */
          .continueCard {
            flex-direction: column;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .continueBtn {
            width: 100% !important;
            text-align: center;
          }
        }

        /* 아주 작은 폰(선택) */
        @media (max-width: 420px) {
          .titleText {
            font-size: 28px !important;
          }
          .episodeBtn {
            font-size: 22px !important;
          }
        }
      `}</style>

      {/* 상단 바 */}
      <div
        className="topBar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div className="titleText" style={{ fontSize: 44, fontWeight: 900 }}>
          무협 소설 채널
        </div>

        {/* ✅ 로그인 버튼: 누르면 /login 이동 */}
        <button
          className="loginBtn"
          onClick={() => router.push("/login")}
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

      {/* ✅ 이어듣기 카드 */}
      {lastPlayed && (
        <div
          className="continueCard"
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

          {/* ✅ 비로그인 -> 로그인으로, 로그인 -> continueHref */}
          <div
            className="continueBtn"
            onClick={() => goIfLoggedIn(continueHref)}
            style={{ textDecoration: "none" }}
          >
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
                textAlign: "center",
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
          </div>
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
            <div
              key={work.id}
              style={{ width: "100%" }}
              onMouseEnter={() => setHoveredId(work.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => goIfLoggedIn(`/work/${work.id}`)} // ✅ 비로그인 -> /login
            >
              <div
                className="workCard"
                style={{
                  border: isHovered
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  transform: isHovered ? "scale(1.01)" : "scale(1)",
                }}
              >
                {/* 썸네일 */}
                <div className="thumbWrap">
                  {/* 썸네일 그라데이션 오버레이 */}
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

                  <img src={work.thumbnail} alt={work.title} className="thumbImg" />
                </div>

                {/* 정보 영역 */}
                <div
                  className="infoArea"
                  style={{
                    padding: 28,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="infoText"
                    style={{
                      fontSize: 30,
                      opacity: 0.9,
                      fontWeight: 700,
                      marginBottom: 30,
                    }}
                  >
                    총 {work.totalEpisodes}화 연재 중
                  </div>

                  {/* 금빛 에피소드 보기 버튼(시각 요소) */}
                  <div
                    className="episodeBtn"
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
            </div>
          );
        })}
      </div>
    </main>
  );
}
