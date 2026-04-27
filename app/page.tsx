"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { works } from "./data/works";
import WorkCard from "@/app/components/work/WorkCard";

import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type LastPlayed = {
  workId: string;
  episodeId: string;
  part: number;
  updatedAt?: number;
};
export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const featuredWorks = works.filter((work: any) => work.featured ?? true);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loginHover, setLoginHover] = useState(false);

  // ✅ 이어듣기 정보
  const [lastPlayed, setLastPlayed] = useState<LastPlayed | null>(null);

  useEffect(() => {
  try {
    const raw = localStorage.getItem("lastPlayed");
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed?.workId || !parsed?.episodeId || !parsed?.part) return;

    setLastPlayed({
      workId: String(parsed.workId),
      episodeId: String(parsed.episodeId),
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
  return `/episode/${lastPlayed.workId}/${lastPlayed.episodeId}?part=${lastPlayed.part}&autoplay=1`;
}, [lastPlayed]);
const lastPlayedWorkTitle = useMemo(() => {
  if (!lastPlayed?.workId) return "";
  return works.find((work) => work.id === lastPlayed.workId)?.title ?? lastPlayed.workId;
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
        background: `
  linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)),
  url("/background.jpg") center / cover no-repeat
`,
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

        .homeHero {
          width: 100%;
          margin: 0 0 28px 0;
          padding: 32px 28px;
          border-radius: 28px;
          border: 1px solid rgba(255,215,120,0.14);
          box-shadow: 0 12px 40px rgba(0,0,0,0.28);
          background-image:
            linear-gradient(90deg, rgba(11,11,18,0.94) 0%, rgba(11,11,18,0.88) 42%, rgba(11,11,18,0.44) 68%, rgba(11,11,18,0.22) 100%),
            url('/images/background.jpg');
          background-size: cover;
          background-position: center right;
          background-repeat: no-repeat;
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .heroTextBox {
          max-width: 620px;
          text-align: left;
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

          .homeHero {
            padding: 22px 18px !important;
            min-height: auto !important;
            background-image:
              linear-gradient(180deg, rgba(11,11,18,0.94) 0%, rgba(11,11,18,0.90) 55%, rgba(11,11,18,0.78) 100%),
              url('/images/background.jpg') !important;
            background-position: center center !important;
          }

          .heroTextBox {
            max-width: 100% !important;
          }

          .heroTitle {
            font-size: 20px !important;
            line-height: 1.45 !important;
          }

          .heroDesc {
            font-size: 14px !important;
            line-height: 1.7 !important;
          }
        }
      `}</style>

      {/* ✅ 홈 소개 박스: 왼쪽 정렬 + 오른쪽 무협 절경 배경 */}
      <div
  style={{
    maxWidth: 900,
    margin: "0 auto 28px",
    padding: "31px 17px",
    borderRadius: 28,
    background:
      "linear-gradient(135deg, rgba(7,10,22,0.58) 0%, rgba(8,11,24,0.46) 45%, rgba(10,13,26,0.34) 100%)",
    border: "1px solid rgba(255,215,120,0.22)",
    boxShadow:
      "0 0 14px rgba(255,215,120,0.18), 0 0 28px rgba(255,215,120,0.010), 0 12px 40px rgba(0,0,0,0.024)",
    animation: "goldBreath 3.2s ease-in-out infinite",
    backdropFilter: "blur(0px)",
  }}
>
  <div
    style={{
      marginTop: -15,
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.2,
      color: "rgba(255,255,255,0.95)",
    }}
  >
    검과 강호의 이야기를
    <br />
    이제 귀로 감상
  </div>

  <p
    style={{
      marginTop: 10,
      maxWidth: 680,
      fontSize: 14,
      lineHeight: 1.5,
      color: "rgba(255,255,255,0.78)",
    }}
  >
    무림북은 창작 무협 소설과 오디오 스토리를 중심으로,
    에피소드별 음성과 자막을 함께 제공하는 감상형 플랫폼입니다.
    강호의 서사를 보다 깊고 편안하게 즐길 수 있도록 구성했습니다.
  </p>
</div>

      {/* 이어듣기 카드 */}
      {lastPlayed && (
        <div
          style={{
            width: "100%",
            maxWidth: 680,
            borderRadius: 20,
            padding: "14px 16px",
            marginBottom: 18,
            border: "1px solid rgba(255,215,120,0.22)",
            background:
              "linear-gradient(135deg, rgba(255,241,168,0.10) 0%, rgba(243,201,105,0.06) 35%, rgba(212,162,60,0.05) 100%)",
            animation: "goldBreath 3.2s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "nowrap",
          }}
        >
          <div
            style={{
              opacity: 0.9,
              fontSize: 14,
              fontWeight: 900,
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {lastPlayedWorkTitle} · {lastPlayed.episodeId}화 · {lastPlayed.part}편부터
          </div>

          <Link
  href={
    user
      ? continueHref
      : `/login?redirect=${encodeURIComponent(continueHref)}`
  }
  style={{ textDecoration: "none" }}
>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                width: "fit-content",
                padding: "9px 14px",
                borderRadius: 999,
                fontWeight: 950,
                fontSize: 14,
                letterSpacing: "-0.2px",
                color: "#2b1d00",
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                border: "1px solid rgba(255,215,120,0.65)",
                boxShadow: "0 0 14px rgba(255,215,120,0.35)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
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
          width: "100%",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, textAlign: "left" }}>대표 작품</div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.72,
              marginTop: 4,
              textAlign: "left",
            }}
          >
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
      <div style={{ display: "grid", gap: 24 }}>
        {featuredWorks.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </main>
  );
}