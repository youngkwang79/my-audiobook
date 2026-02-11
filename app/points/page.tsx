"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/providers/AuthProvider";

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

type EntitlementPayload = {
  points: number;
  is_subscribed: boolean;
  unlocked_until_part: number | null;
};

async function fetchMyPoints(): Promise<number> {
  // ✅ episode_id는 필수라서, points 페이지에서는 더미로 1을 넣어도 되지만
  // 더 깔끔하게 하려면 /api/me/wallet 같은 엔드포인트를 따로 만드는게 정석.
  // 일단 뼈대 단계에서는 episode_id=1로 고정.
  const qs = new URLSearchParams({
    work_id: "cheonmujin",
    episode_id: "1",
  });

  const res = await fetch(`/api/me/entitlements?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed_to_fetch_points");
  const data: EntitlementPayload = await res.json();
  return data.points ?? 0;
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
  const [busy, setBusy] = useState(false);

  // 로그인 전이면 들어오자마자 로그인으로 보내기
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/points");
    }
  }, [loading, user, router]);

  // ✅ DB에서 포인트 로드
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const pts = await fetchMyPoints();
        if (!alive) return;
        setCurrentPoints(pts);
      } catch {
        if (!alive) return;
        setCurrentPoints(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /**
   * ✅ PG 연결 뼈대
   * STEP A) 서버에 주문 생성 요청: /api/payments/create-order
   * STEP B) (PG 결제창 오픈) - PG사 정하면 여기에 붙임
   * STEP C) 결제 성공 후 /api/payments/confirm 호출 → DB points 증가
   */
  const startPayment = async () => {
    if (!selected) return;

    setMsg(null);
    setBusy(true);

    try {
      // 1) 주문 생성(서버)
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_id: "cheonmujin",
          pack_id: selected.id,
          amount: selected.price,
          points: selected.points,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setMsg("주문 생성에 실패했습니다.");
        return;
      }

      /**
       * createData 예시(뼈대):
       * {
       *   order_id: "...",
       *   amount: 3000,
       *   provider: "toss",
       *   client_secret: "...(선택)"
       * }
       */
      const { order_id } = createData;

      // 2) 여기서 PG 결제창을 열어야 함
      // - 토스/아임포트 등 PG사 확정되면, 이 구간을 실제 결제 SDK로 교체
      alert("PG사(토스/아임포트 등) 확정되면 여기서 결제창이 열립니다. 지금은 뼈대 단계입니다.");

      // 3) 결제 성공했다고 가정하고 confirm 호출(뼈대)
      // 실제로는 결제 SDK가 주는 paymentKey/imp_uid 같은 값을 함께 보내야 함
      const confirmRes = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id,
          // payment_key: "...", // PG 확정되면 추가
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        setMsg("결제 확정(검증)에 실패했습니다.");
        return;
      }

      // ✅ 결제 확정 후 DB 포인트 다시 로드
      const pts = await fetchMyPoints();
      setCurrentPoints(pts);
      setMsg("결제가 완료되었습니다. 포인트가 반영되었습니다.");
    } catch {
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
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
                  {p.bonus && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{p.bonus}</div>}
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
            onClick={startPayment}
            disabled={busy}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
              color: "#2b1d00",
              border: "1px solid rgba(255,215,120,0.7)",
              padding: "12px 16px",
              borderRadius: 16,
              fontWeight: 950,
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: 16,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "처리 중..." : "결제하기"}
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
            • 결제 성공 후 포인트 반영은 서버에서만 처리됩니다.
            <br />
            • 다음 단계에서 PG사 확정(토스/아임포트 등)하면 결제창 + 웹훅 검증까지 붙입니다.
          </div>
        </div>
      </div>
    </main>
  );
}
