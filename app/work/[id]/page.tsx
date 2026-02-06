"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { episodes } from "../../data/episodes";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_FREE_UNTIL = 8;

function getUnlockedUntil(): number {
  if (typeof window === "undefined") return DEFAULT_FREE_UNTIL;
  const v = Number(localStorage.getItem("unlockedUntil") || DEFAULT_FREE_UNTIL);
  return Number.isFinite(v) ? v : DEFAULT_FREE_UNTIL;
}

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const workId = String(params.id);
  const workTitle = workId === "cheonmujin" ? "천무진 봉인된 천재" : "알 수 없는 작품";

  const total = episodes.length;

  const [unlockedUntil, setUnlockedUntil] = useState(DEFAULT_FREE_UNTIL);

  useEffect(() => {
    setUnlockedUntil(getUnlockedUntil());
  }, []);

  const goIfLoggedIn = (fn: () => void) => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fn();
  };

  const onClickAuthButton = async () => {
    if (loading) return;

    if (user) {
      await supabase.auth.signOut();
      router.refresh();
      return;
    }
    router.push("/login");
  };

  const goldBtnStyle = (hovered: boolean) => ({
    position: "relative" as const,
    overflow: "hidden" as const,
    background:
      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
    color: "#2b1d00",
    border: hovered ? "1px solid rgba(255,215,120,0.95)" : "1px solid rgba(255,215,120,0.55)",
    padding: "10px 18px",
    borderRadius: 14,
    cursor: loading ? "not-allowed" : "pointer",
    fontWeight: 900,
    boxShadow: hovered
      ? "0 0 20px rgba(255,215,120,0.75), 0 0 80px rgba(255,200,80,0.45)"
      : "0 0 14px rgba(255,215,120,0.45), 0 0 50px rgba(255,200,80,0.25)",
    opacity: loading ? 0.6 : 1,
    transition: "transform 180ms ease, box-shadow 180ms ease, border 180ms ease",
    transform: hovered ? "scale(1.06)" : "scale(1)",
  });

  const [authHover, setAuthHover] = useState(false);

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
      <style>{`
        @keyframes lightSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>

      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
          position: "relative",
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ color: "white", textDecoration: "none" }}>
          ← 홈
        </Link>

        {/* ✅ 홈이랑 같은 금빛 로그인/로그아웃 */}
        <button
          onClick={onClickAuthButton}
          onMouseEnter={() => setAuthHover(true)}
          onMouseLeave={() => setAuthHover(false)}
          disabled={loading}
          style={goldBtnStyle(authHover)}
        >
          {loading ? "확인중..." : user ? "로그아웃" : "로그인"}
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
              animation: authHover ? "lightSweep 0.9s ease forwards" : "none",
              pointerEvents: "none",
            }}
          />
        </button>
      </div>

      {/* 작품 카드 */}
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1200,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>작품</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>{workTitle}</div>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 800 }}>총 {total}화 연재 중</div>

          {typeof window !== "undefined" && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              현재 오픈: 1~{unlockedUntil}화
            </div>
          )}
        </div>

        {/* ✅ “에피소드 보기”는 로그인 체크 후 스크롤 */}
        <button
          style={{
            background: "rgba(0,0,0,0.35)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.35)",
            padding: "10px 14px",
            borderRadius: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
          onClick={() =>
            goIfLoggedIn(() =>
              document.getElementById("episode-list")?.scrollIntoView({ behavior: "smooth" })
            )
          }
        >
          에피소드 보기
        </button>
      </div>

      {/* 에피소드 리스트 */}
      <div id="episode-list" style={{ marginTop: 18, maxWidth: 1200 }}>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 10 }}>
          에피소드 (총 {episodes.length}화)
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {episodes.map((ep) => {
            const isLocked = ep.id > unlockedUntil;

            const href = isLocked ? `/episode/${ep.id}` : `/episode/${ep.id}?autoplay=1`;

            return (
              <Link key={ep.id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isLocked ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.1)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                      }}
                    >
                      {ep.id}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800 }}>{ep.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {isLocked ? "잠금(구독/포인트/광고)" : "재생 가능"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: isLocked ? "transparent" : "#22c55e",
                      border: isLocked ? "1px solid rgba(255,255,255,0.25)" : "none",
                      padding: "8px 12px",
                      borderRadius: 12,
                      fontWeight: 800,
                    }}
                  >
                    {isLocked ? "잠금" : "재생"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
