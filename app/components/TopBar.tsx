"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function TopBar() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
      }}
    >
      {/* 왼쪽 타이틀 */}
      <div style={{ fontSize: 36, fontWeight: 900 }}>무협 소설 채널</div>

      {/* 오른쪽 버튼 */}
      <div style={{ display: "flex", gap: 12 }}>
        {/* 로그인 전 */}
        {!user && (
          <button
            onClick={() => router.push("/login")}
            style={{
              background:
                "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
              color: "#2b1d00",
              border: "1px solid rgba(255,215,120,0.7)",
              padding: "8px 16px",
              borderRadius: 14,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        )}

        {/* 로그인 후 */}
        {user && (
          <>
            <button
              onClick={() => router.push("/points")}
              style={{
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                color: "#2b1d00",
                border: "1px solid rgba(255,215,120,0.7)",
                padding: "8px 16px",
                borderRadius: 14,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              💰 보유포인트
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              style={{
                background:
                  "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
                color: "#2b1d00",
                border: "1px solid rgba(255,215,120,0.7)",
                padding: "8px 16px",
                borderRadius: 14,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  );
}
