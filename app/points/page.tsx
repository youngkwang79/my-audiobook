"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/providers/AuthProvider";

type Pack = {
  id: string;
  priceLabel: string;   // 표시용: "₩1,000"
  pointsLabel: string;  // 표시용: "1,000P"
  price: number;        // 숫자: 1000
  points: number;       // 숫자: 1000
  bonus?: string;       // 표시용: "보너스 +10%"
};

function formatWon(n: number) {
  return "₩" + n.toLocaleString("ko-KR");
}
function formatP(n: number) {
  return n.toLocaleString("ko-KR") + "P";
}

function getPoints() {
  if (typeof window === "undefined") return 0;
  const v = Number(localStorage.getItem("points") || 0);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}
function setPoints(p: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem("points", String(Math.max(0, p)));
}

export default function PointsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ✅ STEP1: 충전 패키지(원하는대로 나중에 변경 가능)
  const packs: Pack[] = useMemo(
    () => [
      { id: "p1", price: 1000, points: 1000, priceLabel: formatWon(1000), pointsLabel: formatP(1000) },
      { id: "p2", price: 3000, points: 3300, bonus: "보너스 +10%", priceLabel: formatWon(3000), pointsLabel: formatP(3300) },
      { id: "p3", price: 5000, points: 5800, bonus: "보너스 +16%", priceLabel: formatWon(5000), pointsLabel: formatP(5800) },
      { id: "p4", price: 10000, points: 12000, bonus: "보너스 +20%", priceLabel: formatWon(10000), pointsLabel: formatP(12000) },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState(packs[0]?.id ?? "p1");
  const selected = useMemo(() => packs.find((p) => p.id === selectedId) ?? packs[0], [packs, selectedId]);

  const [currentPoints, setCurrentPoints] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  // 로그인 전이면 들어오자마자 로그인으로 보내기(선택이지만 UX 좋음)
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/points");
    }
  }, [loading, user, router]);

  // 화면 표시용 포인트 로드
  useEffect(() => {
    setCurrentPoints(getPoints());
  }, []);

  // ✅ STEP1: “결제”는 아직 안 붙이고, 흐름만 체크(테스트 충전 버튼 제공)
  const simulateCharge = () => {
    if (!selected) return;
    const next = currentPoints + selected.points;
    setPoints(next);
    setCurrentPoints(next);
    setMsg(`테스트 충전 완료: ${selected.pointsLabel}가 추가되었습니다.`);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 20 }}>
      <TopBar />

      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ margin: "8px 0 12px", fontSize: 28, fontWeight: 950 }}>포인트 충전</h1>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div>
            <div style={{ fontSize: 20, opacity: 0.8, marginBottom: 6 }}>현재 보유 포인트</div>
            <div style={{ fontSize: 28, fontWeight: 950 }}>{currentPoints.toLocaleString("ko-KR")}P</div>
          </div>

          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "10px 14px",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            홈으로
          </button>
        </div>

        <div style={{ height: 14 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
          }}
        >
          {packs.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 16,
                  border: active
                    ? "2px solid rgba(255,215,120,0.9)"
                    : "1px solid rgba(255,255,255,0.12)",
                  background: active ? "rgba(255,215,120,0.10)" : "rgba(255,255,255,0.04)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>
                    {p.priceLabel} <span style={{ opacity: 0.75, fontWeight: 800 }}>→</span> {p.pointsLabel}
                  </div>
                  {p.bonus && (
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{p.bonus}</div>
                  )}
                </div>

                <div
                  style={{
                    minWidth: 86,
                    textAlign: "center",
                    borderRadius: 14,
                    padding: "8px 10px",
                    fontWeight: 950,
                    background:
                      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                    color: "#2b1d00",
                    border: "1px solid rgba(255,215,120,0.65)",
                  }}
                >
                  선택
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ height: 14 }} />

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85 }}>선택한 충전</div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950 }}>
            {selected?.priceLabel} → {selected?.pointsLabel}
          </div>

          <div style={{ height: 12 }} />

          {/* STEP1: 결제 버튼(아직 결제 연결 전) */}
          <button
            onClick={() => alert("STEP 2에서 결제사(토스/Stripe) 연결을 붙일 거예요!")}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
              color: "#2b1d00",
              border: "1px solid rgba(255,215,120,0.7)",
              padding: "12px 16px",
              borderRadius: 16,
              fontWeight: 950,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            결제하기 (준비중)
          </button>

          <div style={{ height: 10 }} />

          {/* STEP1: 테스트용 충전 */}
          <button
            onClick={simulateCharge}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.10)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "12px 16px",
              borderRadius: 16,
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            테스트 충전 (로컬 포인트 +{selected?.pointsLabel})
          </button>

          {msg && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                whiteSpace: "pre-wrap",
                fontSize: 13,
                opacity: 0.9,
              }}
            >
              {msg}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
            • STEP 1: UI/흐름 확인 단계입니다. (결제는 아직 연결되지 않아요)
            <br />
            • STEP 2에서 결제 성공 시에만 포인트가 증가하도록 서버(Webhook)까지 붙일 예정입니다.
          </div>
        </div>
      </div>
    </main>
  );
}
