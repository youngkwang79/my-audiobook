"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { works } from "../data/works";
import { useAuth } from "@/app/providers/AuthProvider";

export default function WorksPage() {
  const { user } = useAuth();

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

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0 }}>전체 작품</h1>
          <p style={{ marginTop: 8, fontSize: 15, opacity: 0.72, lineHeight: 1.7 }}>
            무림북에서 제공하는 창작 무협 오디오 스토리 작품 목록입니다.
            원하는 작품을 선택해 회차별로 감상할 수 있습니다.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {works.map((work) => (
            <Link
              key={work.id}
              href={user ? `/work/${work.id}` : `/login?redirect=${encodeURIComponent(`/work/${work.id}`)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background:
                    "radial-gradient(circle at top left, rgba(255,215,120,0.08), transparent 35%), rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 24,
                  overflow: "hidden",
                  transition: "transform 180ms ease, border 180ms ease",
                }}
              >
                <div
                  style={{
                    padding: 14,
                    background: "rgba(0,0,0,0.28)",
                  }}
                >
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      borderRadius: 16,
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
                    {work.title}
                  </div>

                  <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.7 }}>
                    총 {work.totalEpisodes}화 · 무료-각 화의 {work.freeEpisodes}편
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      opacity: 0.72,
                      lineHeight: 1.6,
                    }}
                  >
                    무림북의 창작 무협 오디오 스토리를 회차별로 감상해 보세요.
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: 14,
                      fontWeight: 900,
                      color: "#2b1d00",
                      background:
                        "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                      border: "1px solid rgba(255,215,120,0.65)",
                    }}
                  >
                    작품 보기
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}