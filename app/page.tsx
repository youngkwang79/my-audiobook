"use client";


import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { works } from "./data/works";

import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type LastPlayed = {
  episodeId: number;
  part: number;
  updatedAt?: number;
};

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

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

  const handleAuthClick = async () => {
    if (loading) return;

    if (user) {
  const sb = supabase;
  if (!sb) {
    alert(
      "Supabase 설정이 아직 적용되지 않았습니다.\nVercel 환경변수 저장 후 재배포(Redeploy) 해주세요."
    );
    router.push("/login");
    return;
  }

  await sb.auth.signOut();
  router.refresh();
  return;
}

    router.push("/login");
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

      <TopBar />

            {/* ✅ 공통 스타일 (모바일 대응 포함) */}
      <style>{`
        @keyframes lightSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes goldBreath {
          0% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
          50% { box-shadow: 0 0 26px rgba(255,215,120,0.35), 0 0 90px rgba(255,200,80,0.18); }
          100% { box-shadow: 0 0 14px rgba(255,215,120,0.20); }
        }

        /* ✅ 작품 카드: 모바일에서는 세로로 쌓이게 */
        @media (max-width: 640px) {
          .workCard {
            flex-direction: column !important;
            max-width: 100% !important;
          }
          .thumbWrap {
            width: 100% !important;
            height: auto !important;
          }
          .thumbInner {
            width: 100% !important;
          }
          .topTitle {
            font-size: 34px !important;
          }
          .authBtn {
            font-size: 22px !important;
            padding: 10px 14px !important;
          }
        }
      `}</style>

          {/* 이어듣기 카드 */}
      {lastPlayed && (
        <div
          style={{
            maxWidth: 600,
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
            flexWrap: "wrap",
          }}
        >
          <div style={{ opacity: 0.9, fontSize: 15, fontWeight: 950 }}>
            {lastPlayed.episodeId}화 · {lastPlayed.part}편부터 이어서 재생
          </div>

          <Link href={user ? continueHref : "/login"} style={{ textDecoration: "none" }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                width: "fit-content",
                padding: "12px 20px",
                borderRadius: 999,
                fontWeight: 950,
                fontSize: 15,
                letterSpacing: "-0.3px",
                color: "#2b1d00",
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                border: "1px solid rgba(255,215,120,0.65)",
                boxShadow: "0 0 18px rgba(255,215,120,0.40)",
                cursor: "pointer",
                whiteSpace: "nowrap",
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
              href={user ? `/work/${work.id}` : `/login?redirect=${encodeURIComponent(`/work/${work.id}`)}`}
  style={{ textDecoration: "none", color: "inherit", width: "100%" }}
  onMouseEnter={() => setHoveredId(work.id)}
  onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="workCard"
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
                  maxWidth: 600,
                  transform: isHovered ? "scale(1.01)" : "scale(1)",
                  transition: "transform 180ms ease, border 180ms ease",
                }}
              >
                {/* ✅ 썸네일 영역: 박스가 이미지에 맞게 (안 짤리고, 모바일에서도 100%) */}
                <div
                  className="thumbWrap"
                  style={{
                    width: 350,
                    flexShrink: 0,
                    background: "rgba(0,0,0,0.35)",
                    padding: 14,
                    boxSizing: "border-box",
                  }}
                >
                  <div className="thumbInner" style={{ width: "100%" }}>
                    <img
                      src={work.thumbnail}
                      alt={work.title}
                      style={{
                        width: "100%",
                        height: "auto",          // ✅ 핵심: 이미지 비율 유지 + 짤림 방지
                        display: "block",
                        objectFit: "contain",
                        borderRadius: 18,
                      }}
                    />

                    {/* ✅ “55화 연재중”을 썸네일 밑으로 (글씨 크기 15) */}
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 15,
                        fontWeight: 800,
                        opacity: 0.9,
                      }}
                    >
                      {work.totalEpisodes}화 연재중
                    </div>
                  </div>
                </div>

                {/* 정보 영역 (기존 구조 유지: 나중에 텍스트/버튼 추가 가능) */}
                <div
                  style={{
                    padding: 28,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                ></div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
