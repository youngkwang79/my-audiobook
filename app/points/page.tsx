"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

function formatP(n: number) {
  try {
    return n.toLocaleString("ko-KR") + "P";
  } catch {
    return String(n) + "P";
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const sb = supabase;
  if (!sb) return {};
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PointsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [selected, setSelected] = useState<number>(1000);

  const plans = useMemo(
    () => [
      { price: 1000, points: 1000, bonusText: "" },
      { price: 3000, points: 3300, bonusText: "보너스 +10%" },
      { price: 5000, points: 5800, bonusText: "보너스 +16%" },
      { price: 10000, points: 12000, bonusText: "보너스 +20%" },
    ],
    []
  );

  const refreshPoints = async () => {
    // 1) localStorage 우선 반영
    try {
      const v = Number(localStorage.getItem("points") || "0");
      if (Number.isFinite(v)) setCurrentPoints(v);
    } catch {}

    // 2) 서버 우선 시도
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/me/entitlements", {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      const serverPoints =
        typeof json?.points === "number"
          ? json.points
          : typeof json?.data?.points === "number"
          ? json.data.points
          : typeof json?.currentPoints === "number"
          ? json.currentPoints
          : null;

      if (typeof serverPoints === "number") {
        setCurrentPoints(serverPoints);
        try {
          localStorage.setItem("points", String(serverPoints));
        } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    if (!user) {
      setCurrentPoints(0);
      return;
    }

    let alive = true;

    refreshPoints();

    // 포인트 변경 이벤트 수신
    const onPointsUpdate = (e: any) => {
      const p = e?.detail?.points;
      if (typeof p === "number") {
        setCurrentPoints(p);
        try {
          localStorage.setItem("points", String(p));
        } catch {}
      } else {
        refreshPoints();
      }
    };
    window.addEventListener("points:update", onPointsUpdate);

    // 포커스 돌아오면 재조회
    const onFocus = () => refreshPoints();
    window.addEventListener("focus", onFocus);

    // 주기적으로도 localStorage 반영(TopBar처럼)
    const t = setInterval(() => {
      if (!alive) return;
      try {
        const v = Number(localStorage.getItem("points") || "0");
        if (Number.isFinite(v)) setCurrentPoints(v);
      } catch {}
    }, 800);

    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("points:update", onPointsUpdate);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <>
      <TopBar />

      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b12",
          color: "white",
          padding: "28px 16px 60px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            position: "fixed",
            top: 20,
            left: 24,
            background: "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
            border: "1px solid rgba(255,215,120,0.9)",
            borderRadius: 16,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: "pointer",
            zIndex: 9999,
          }}
        >
          ← 이전
        </button>

        <div style={{ maxWidth: 980, margin: "0 auto", paddingTop: 70 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 18 }}>포인트 충전</h1>

          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ opacity: 0.85, fontWeight: 700 }}>현재 보유 포인트</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>
                {formatP(currentPoints)}
              </div>
            </div>

            <button
              onClick={() => refreshPoints()}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "10px 14px",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
              title="포인트 새로고침"
            >
              새로고침
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {plans.map((p) => {
              const active = selected === p.price;
              return (
                <button
                  key={p.price}
                  onClick={() => setSelected(p.price)}
                  style={{
                    textAlign: "left",
                    padding: 18,
                    borderRadius: 18,
                    cursor: "pointer",
                    background: active ? "rgba(255,215,120,0.08)" : "rgba(255,255,255,0.04)",
                    border: active
                      ? "2px solid rgba(255,215,120,0.65)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900 }}>
                        ₩{p.price.toLocaleString("ko-KR")} → {formatP(p.points).replace("P", "P")}
                      </div>
                      {p.bonusText ? (
                        <div style={{ opacity: 0.8, marginTop: 6 }}>{p.bonusText}</div>
                      ) : (
                        <div style={{ opacity: 0.5, marginTop: 6 }}> </div>
                      )}
                    </div>

                    <div
                      style={{
                        alignSelf: "center",
                        background:
                          "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
                        border: "1px solid rgba(255,215,120,0.9)",
                        borderRadius: 16,
                        padding: "10px 16px",
                        fontWeight: 900,
                      }}
                    >
                      선택
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ opacity: 0.85, fontWeight: 800 }}>선택한 충전</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
              ₩{selected.toLocaleString("ko-KR")} →
              {" "}
              {formatP(plans.find((x) => x.price === selected)?.points ?? selected)}
            </div>

            <button
              onClick={() => alert("결제 연결(PortOne) 단계에서 여기 버튼을 실제 결제로 연결하면 됩니다!")}
              style={{
                marginTop: 14,
                width: "100%",
                height: 56,
                borderRadius: 18,
                fontWeight: 900,
                fontSize: 18,
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
                border: "1px solid rgba(255,215,120,0.9)",
              }}
            >
              결제하기 (준비중)
            </button>

            <div style={{ opacity: 0.65, fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
              • 포인트는 서버(DB) 기준으로 관리하는 걸 추천합니다. <br />
              • 지금 화면의 “보유 포인트”는 서버(/api/me/entitlements) 값을 우선으로 표시합니다.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}