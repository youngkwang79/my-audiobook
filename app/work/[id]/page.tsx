"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { episodes } from "../../data/episodes";

// ✅ (로그인 연동용) AuthProvider + supabaseClient 사용 (현재 파일에 있던 그대로 유지)
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

  const workId = String((params as any).id);
  const workTitle = workId === "cheonmujin" ? "천무진 봉인된 천재" : "알 수 없는 작품";

  const total = episodes.length;
  const unlockedUntil = getUnlockedUntil();

  // ✅ 잠김 모달 상태
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);

  const openPayModal = (epId: number) => {
    setSelectedEpisodeId(epId);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setSelectedEpisodeId(null);
  };

  // (현재 파일에 있던 로그아웃 함수 유지: 지금 화면에서는 버튼 연결 안 되어 있어도 OK)
  const onAuthClick = async () => {
    if (loading) return;

    if (user) {
      await supabase.auth.signOut();
      router.refresh();
      return;
    }

    router.push("/login");
  };

  const redirectAfterPoints = useMemo(() => `/work/${workId}`, [workId]);

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

        <button
          style={{
            background: "rgba(0,0,0,0.35)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.35)",
            padding: "10px 14px",
            borderRadius: 14,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onClick={() =>
            document.getElementById("episode-list")?.scrollIntoView({ behavior: "smooth" })
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

            const card = (
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {isLocked ? "잠금" : "재생"}
                </div>
              </div>
            );

            // ✅ 여기만 바뀐 핵심:
            // 잠긴 편은 Link로 이동하지 않고 "모달"을 띄움
            if (isLocked) {
              return (
                <div
                  key={ep.id}
                  onClick={() => openPayModal(ep.id)}
                  style={{ cursor: "pointer" }}
                  role="button"
                >
                  {card}
                </div>
              );
            }

            // 열린 편은 기존처럼 이동
            return (
              <Link key={ep.id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ✅ 잠김 모달 (3개 선택지) */}
      {payModalOpen && (
        <div
          onClick={closePayModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(12,12,20,0.96)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>🔒 잠긴 에피소드</div>
              <button
                onClick={closePayModal}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "white",
                  borderRadius: 12,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                닫기
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
              {selectedEpisodeId ? (
                <>
                  <b>{selectedEpisodeId}화</b>는 잠겨 있습니다.
                </>
              ) : (
                <>이 에피소드는 잠겨 있습니다.</>
              )}
              <br />
              아래 방법 중 하나를 선택해 주세요.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {/* 1) 포인트 60P로 1편 공개 -> 포인트 결제창으로 이동 */}
              <button
                onClick={() => {
                  router.push(
                    `/points?redirect=${encodeURIComponent(
                      redirectAfterPoints
                    )}&unlockEpisode=${encodeURIComponent(String(selectedEpisodeId ?? ""))}&unlockPrice=60`
                  );
                }}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                  color: "#2b1d00",
                  border: "1px solid rgba(255,215,120,0.7)",
                  padding: "14px 14px",
                  borderRadius: 16,
                  fontWeight: 950,
                  cursor: "pointer",
                  fontSize: 16,
                  textAlign: "left",
                }}
              >
                💰 포인트로 1편 공개 (60P / 60원)
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  포인트 결제창으로 이동합니다.
                </div>
              </button>

              {/* 2) 광고 참여로 전체 공개 (준비중) */}
              <button
                onClick={() =>
                  alert("광고 참여 기능은 결제 연결 후에 붙일 예정입니다. (준비중)")
                }
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "14px 14px",
                  borderRadius: 16,
                  fontWeight: 950,
                  cursor: "pointer",
                  fontSize: 16,
                  textAlign: "left",
                }}
              >
                📺 광고 참여로 전체 공개
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  결제 완성 후 광고 SDK를 붙이는 게 안정적입니다.
                </div>
              </button>

              {/* 3) 월 구독 (준비중) */}
              <button
                onClick={() => alert("월 구독하기는 준비중입니다!")}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "14px 14px",
                  borderRadius: 16,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 16,
                  textAlign: "left",
                }}
              >
                🗓️ 월 구독하기 (준비중)
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                  추후 월 구독으로 전체 이용 가능하게 만들 예정이에요.
                </div>
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
              • 시니어 분들도 쉽게 결제할 수 있도록 카드결제/계좌이체 중심으로 준비할게요.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
