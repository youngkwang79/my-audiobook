"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setPoints(0);
      return;
    }

    const load = async () => {
      const res = await fetch(
        `/api/me/entitlements?work_id=cheonmujin&episode_id=1`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setPoints(data.points ?? 0);
    };

    load();
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
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
      {pathname !== "/" && (
        <button onClick={() => router.back()} style={goldStyle}>
          ← 이전
        </button>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        {loading ? (
          <button style={{ ...goldStyle, opacity: 0.7 }} disabled>
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
              style={{ ...goldStyle, fontSize: 20 }}
            >
              {points.toLocaleString()}P
            </button>

            <button
              onClick={async () => {
                await fetch("/api/logout");
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