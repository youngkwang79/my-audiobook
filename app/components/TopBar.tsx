"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [points, setPoints] = useState<number>(0);

  // ✅ 보유 포인트 읽기 (현재는 localStorage 기준)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = Number(localStorage.getItem("points") || 0);
    setPoints(p);
  }, []);

  if (loading) return null;

  const goldStyle = {
    background:
      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
    color: "#2b1d00",
    border: "1px solid rgba(255,215,120,0.7)",
    padding: "8px 16px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
      }}
    >
      {/* 왼쪽 영역 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* 뒤로가기 버튼 */}
        {pathname !== "/" && (
  <button onClick={() => router.back()} style={goldStyle}>
    ← 이전
  </button>
)}

        {/* 타이틀 */}
        <div style={{ fontSize: 32, fontWeight: 900 }}>
          무협 소설 채널
        </div>
      </div>

      {/* 오른쪽 버튼 */}
      <div style={{ display: "flex", gap: 12 }}>
        {/* 로그인 전 */}
        {!user && (
          <button onClick={() => router.push("/login")} style={goldStyle}>
            로그인
          </button>
        )}

        {/* 로그인 후 */}
        {user && (
          <>
            {/* 보유 포인트 표시 */}
            <button onClick={() => router.push("/points")} style={goldStyle}>
              {points.toLocaleString()}P
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              style={goldStyle}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  );
}
