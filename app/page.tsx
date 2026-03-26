"use client";


import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { works } from "./data/works";


import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/app/lib/supabaseClient";

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

  const previewWorks = works.slice(0, 3);
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
  return `/episode/${lastPlayed.episodeId}?part=${lastPlayed.part}&autoplay=1`;
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
    router.refresh(); // 또는 router.push("/") 로 바꿔도 됨
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
     
     <div
  style={{
    maxWidth: 900,
    margin: "0 auto 28px",
    padding: "28px 24px",
    borderRadius: 28,
    background:
      "radial-gradient(circle at top left, rgba(255,215,120,0.12), transparent 32%), rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,215,120,0.14)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
  }}
>
  <div
    style={{
      fontSize: 54,
      fontWeight: 950,
      lineHeight: 1,
      letterSpacing: "-1.2px",
      background:
        "linear-gradient(180deg,#fffbe0 0%,#ffe9a3 25%,#f2cd72 50%,#d39d32 75%,#fff3b8 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow:
        "0 0 2px rgba(255,245,210,0.28), 0 0 16px rgba(255,215,120,0.16)",
    }}
  >
  </div>

  <div
    style={{
      marginTop: 20,
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.5,
      color: "rgba(255,255,255,0.95)",
    }}
  >
    검과 강호의 이야기를
    <br />
    이제 귀로 듣다
  </div>

  <p
    style={{
      marginTop: 14,
      maxWidth: 680,
      fontSize: 15,
      lineHeight: 1.8,
      color: "rgba(255,255,255,0.72)",
    }}
  >
    무림북은 창작 무협 소설과 오디오 스토리를 중심으로,
    에피소드별 음성과 자막을 함께 제공하는 감상형 플랫폼입니다.
    강호의 서사를 보다 깊고 편안하게 즐길 수 있도록 구성했습니다.
  </p>
</div>


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

<div
  style={{
    maxWidth: 600,
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  }}
>
  <div>
    <div style={{ fontSize: 22, fontWeight: 900 }}>대표 작품</div>
    <div style={{ fontSize: 14, opacity: 0.72, marginTop: 4 }}>
      무림북의 창작 무협 작품을 만나보세요
    </div>
  </div>

  <button
    onClick={() => router.push("/works")}
    style={{
      background:
        "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
      color: "#2b1d00",
      border: "1px solid rgba(255,215,120,0.7)",
      padding: "10px 16px",
      borderRadius: 14,
      fontWeight: 900,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    전체 작품 보기
  </button>
</div>

      {/* 작품 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 22,
          justifyItems: "start",
        }}
      >
        {previewWorks.map((work) => {
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
                className="workCard"
                style={{
  background:
    "radial-gradient(circle at top left, rgba(255,215,120,0.08), transparent 35%), rgba(255,255,255,0.06)",
  border: isHovered
    ? "1px solid rgba(255,215,120,0.35)"
    : "1px solid rgba(255,255,255,0.1)",
  borderRadius: 26,
  overflow: "hidden",
  cursor: "pointer",
  display: "flex",
  alignItems: "stretch",
  maxWidth: 980,
  transform: isHovered ? "translateY(-2px) scale(1.01)" : "scale(1)",
  boxShadow: isHovered
    ? "0 12px 28px rgba(0,0,0,0.28), 0 0 18px rgba(255,215,120,0.12)"
    : "0 8px 18px rgba(0,0,0,0.18)",
  transition: "transform 180ms ease, border 180ms ease, box-shadow 180ms ease",
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
                {/* 작품 정보 영역 */}
<div
  style={{
    padding: 28,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  }}
>
  <div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 900,
        marginBottom: 8,
      }}
    >
      {work.title}
    </div>

    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        opacity: 0.85,
        marginBottom: 12,
      }}
    >
      십 년 동안 침묵했던 문주의 서자, 이제 강호가 다시 흔들린다
    </div>

      </div>

  <button
    style={{
      marginTop: 20,
      width: 150,
      padding: "10px 14px",
      borderRadius: 14,
      fontWeight: 900,
      border: "1px solid rgba(255,215,120,0.6)",
      background:
        "linear-gradient(135deg,#fff1a8 0%,#f3c969 40%,#d4a23c 70%,#fff1a8 100%)",
      color: "#2b1d00",
      cursor: "pointer",
    }}
  >
    작품 보기
  </button>
</div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
