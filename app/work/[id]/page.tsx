"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { episodes } from "../../data/episodes";

const DEFAULT_FREE_UNTIL = 8;

function getUnlockedUntil(): number {
  if (typeof window === "undefined") return DEFAULT_FREE_UNTIL;
  const v = Number(localStorage.getItem("unlockedUntil") || DEFAULT_FREE_UNTIL);
  return Number.isFinite(v) ? v : DEFAULT_FREE_UNTIL;
}

export default function WorkDetailPage() {
  const params = useParams();
  const workId = String(params.id);

  const workTitle = workId === "cheonmujin" ? "천무진 봉인된 천재" : "알 수 없는 작품";

  const total = episodes.length;
  const unlockedUntil = getUnlockedUntil();

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
      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Link href="/" style={{ color: "white", textDecoration: "none" }}>
          ← 홈
        </Link>

        <button
          style={{
            background: "transparent",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "8px 12px",
            borderRadius: 12,
            cursor: "pointer",
          }}
          onClick={() => alert("로그인은 다음 단계에서 연결할 거예요!")}
        >
          로그인
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
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>작품</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
            {workTitle}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 800 }}>
            총 {total}화 연재 중
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            현재 오픈: 1~{unlockedUntil}화
          </div>
        </div>

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
            document
              .getElementById("episode-list")
              ?.scrollIntoView({ behavior: "smooth" })
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
            const href = isLocked
              ? `/episode/${ep.id}`
              : `/episode/${ep.id}?autoplay=1`;

            return (
              <Link
                key={ep.id}
                href={href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
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
                      border: isLocked
                        ? "1px solid rgba(255,255,255,0.25)"
                        : "none",
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
