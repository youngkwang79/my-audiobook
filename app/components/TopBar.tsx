"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, loading } = useAuth();

  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    const loadPoints = async () => {
      try {
        if (!user || !session?.access_token) {
          if (alive) setPoints(0);
          return;
        }

        const res = await fetch("/api/me/wallet", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (alive) setPoints(0);
          return;
        }

        if (alive) {
          setPoints(Number(data?.points ?? 0));
        }
      } catch (error) {
        console.error(error);
        if (alive) setPoints(0);
      }
    };

    loadPoints();

    const handleWalletUpdated = () => {
      loadPoints();
    };

    window.addEventListener("wallet-updated", handleWalletUpdated);

    return () => {
      alive = false;
      window.removeEventListener("wallet-updated", handleWalletUpdated);
    };
  }, [user?.id, session?.access_token]);

  const smallGoldStyle: React.CSSProperties = {
    background:
      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
    color: "#2b1d00",
    border: "1px solid rgba(255,215,120,0.7)",
    padding: "6px 10px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
    pointerEvents: "auto",
    WebkitTapHighlightColor: "transparent",
  };

  const goBackSmart = () => {
    if (typeof window === "undefined") return;

    if (window.history.length > 1) {
      router.back();
      return;
    }

    if (pathname.startsWith("/episode") || pathname.startsWith("/work")) {
      router.push("/work/cheonmujin");
      return;
    }

    router.push("/");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
        padding: "6px 10px",
        position: "relative",
        zIndex: 10000,
        background: "transparent",
backdropFilter: "none",
        borderBottom: "1px solid rgba(255,215,120,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {pathname !== "/" && (
          <button onClick={goBackSmart} style={smallGoldStyle}>
            ← 이전
          </button>
        )}

        {pathname === "/" && (
          <div
            onClick={() => router.push("/")}
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.02,
              userSelect: "none",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 950,
                letterSpacing: "-1.2px",
                background:
                  "linear-gradient(180deg, #fffbe0 0%, #ffe9a3 20%, #f2cd72 45%, #d39d32 70%, #fff3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                WebkitTextStroke: "0.4px rgba(255,245,210,0.28)",
                textShadow:
                  "0 0 2px rgba(255,245,210,0.35), 0 0 12px rgba(255,215,120,0.22), 0 0 30px rgba(212,162,60,0.14)",
                filter: "drop-shadow(0 3px 12px rgba(255,215,120,0.16))",
              }}
            >
              무림북
            </div>

            <div
              style={{
                marginTop: 5,
                marginLeft: 3,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.4px",
                color: "rgba(255, 237, 190, 0.76)",
                textShadow: "0 0 10px rgba(255,215,120,0.10)",
              }}
            >
              창작 무협 오디오 스토리
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {loading ? (
          <button style={{ ...smallGoldStyle, opacity: 0.7, cursor: "default" }} disabled>
            로딩중
          </button>
        ) : !user ? (
          <>
            <button onClick={() => router.push("/faq")} style={smallGoldStyle}>
              FAQ
            </button>

            <button onClick={() => router.push("/login")} style={smallGoldStyle}>
              로그인
            </button>
          </>
        ) : (
          <>
            <button onClick={() => router.push("/faq")} style={smallGoldStyle}>
              FAQ
            </button>

            <button
              onClick={() => router.push("/points")}
              style={{
                ...smallGoldStyle,
                minWidth: 74,
                textAlign: "center",
              }}
            >
              {points.toLocaleString("ko-KR")}P
            </button>
          </>
        )}
      </div>
    </div>
  );
}