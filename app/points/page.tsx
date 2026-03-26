"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/app/lib/supabaseClient";

type Pack = {
  id: string;
  priceLabel: string;
  pointsLabel: string;
  price: number;
  points: number;
  bonus?: string;
};

function formatWon(n: number) {
  return "₩" + n.toLocaleString("ko-KR");
}
function formatP(n: number) {
  return n.toLocaleString("ko-KR") + "P";
}
async function getAccessToken() {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return null;
  return session?.access_token ?? null;
}
export default function PointsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/points");
    }
  }, [loading, user, router]);

  const loadWallet = async () => {
  try {
    const token = await getAccessToken();

    if (!token) {
      setCurrentPoints(0);
      return;
    }

      const res = await fetch("/api/me/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setCurrentPoints(0);
        return;
      }

      setCurrentPoints(Number(data?.points ?? 0));
    } catch (error) {
      console.error(error);
      setCurrentPoints(0);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadWallet();
  }, [user?.id]);

  const simulateCharge = async () => {
  if (!selected) return;

  try {
    const token = await getAccessToken();

    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/login?redirect=/points");
      return;
    }

      const res = await fetch("/api/dev/credit-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ points: selected.points }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`테스트 충전에 실패했습니다. (${data?.error ?? "unknown_error"})`);
        return;
      }

      setCurrentPoints(Number(data?.points ?? 0));
      window.dispatchEvent(new Event("wallet-updated"));
      setMsg(`테스트 충전 완료: ${selected.pointsLabel}가 추가되었습니다.`);
    } catch (error) {
      console.error(error);
      alert("네트워크 오류가 발생했습니다.");
    }
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

          <button
            onClick={() => alert("STEP 2에서 결제사(토스/카카오페이) 연결을 붙일 거예요!")}
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
            테스트 충전 (DB 포인트 +{selected?.pointsLabel})
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