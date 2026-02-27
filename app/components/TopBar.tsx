"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = Number(localStorage.getItem("points") || 0);
    setPoints(Number.isFinite(p) ? p : 0);
  }, [user?.id]);

  const goldStyle: React.CSSProperties = {
    background:
      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
    color: "#2b1d00",
    border: "1px solid rgba(255,215,120,0.7)",
    padding: "8px 16px",
    borderRadius: 14,
    fontWeight: 900,
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

  const handleLogout = async () => {
    const sb = supabase;
    if (!sb) {
      alert("Supabase 환경변수가 아직 적용되지 않았습니다.\nVercel 환경변수 저장 후 Redeploy 해주세요.");
      router.push("/login");
      return;
    }
    await sb.auth.signOut();
    router.push("/");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
        position: "relative",
        zIndex: 10000,
      }}
    >
      {/* 왼쪽 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {pathname !== "/" && (
          <button onClick={goBackSmart} style={goldStyle}>
            ← 이전
          </button>
        )}

        {pathname === "/" && (
          <div style={{ fontSize: 36, fontWeight: 900 }}>무협 소설 채널</div>
        )}
      </div>

      {/* 오른쪽 */}
      <div style={{ display: "flex", gap: 12 }}>
        {loading ? (
          <button style={{ ...goldStyle, opacity: 0.7, cursor: "default" }} disabled>
            로딩중
          </button>
        ) : !user ? (
          <button onClick={() => router.push("/login")} style={goldStyle}>
            로그인
          </button>
        ) : (
          <>
            <button
              onClick={() => router.push("/points")}
              style={{ ...goldStyle, fontSize: 20, letterSpacing: 0.3 }}
            >
              {points.toLocaleString()}P
            </button>

            <button onClick={handleLogout} style={goldStyle}>
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  );
}