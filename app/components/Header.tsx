// app/components/Header.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function Header() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  return (
    <div
      style={{
        width: "100%",
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        backdropFilter: "blur(10px)",
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          color: "white",
          textDecoration: "none",
          fontWeight: 800,
        }}
      >
        홈
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {loading ? (
          <span style={{ opacity: 0.8 }}>로딩중...</span>
        ) : user ? (
          <>
            <span style={{ opacity: 0.9, fontSize: 12 }}>
              로그인: {user.email ?? "사용자"}
            </span>
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        )}
      </div>
    </div>
  );
}
