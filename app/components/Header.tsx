"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { useGameStore } from "@/app/lib/game/useGameStore"; // [수정] 게임 스토어 가져오기

export default function Header() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { syncToCloud, triggerSave } = useGameStore(); // [수정] 동기화 함수 추출

  const handleLogout = async () => {
    // 1. 로그아웃 전 즉시 서버에 현재 데이터 저장 (가장 중요)
    try {
      console.log("로그아웃 전 데이터 동기화 중...");
      await syncToCloud(); //
    } catch (e) {
      console.error("로그아웃 전 동기화 실패:", e);
    }

    // 2. 실제 로그아웃 실행
    await signOut();

    // 3. 로컬 스토리지 정리 (주의: 게임 데이터 관련 키가 있다면 삭제하지 않아야 재접속 시 유지됨)
    try {
      // 기존에 있던 'points' 등을 지우면 로그아웃 시 로컬 데이터가 날아갑니다.
      // 만약 로그아웃 후에도 기기에 데이터를 남기고 싶다면 아래 localStorage 관련 줄들을 주석 처리하세요.
      localStorage.removeItem("points");
      localStorage.removeItem("lastPlayed");
      
      // 만약 'murimbook-game-save-v12' 같은 게임 저장 키가 있다면 여기서 지우지 마세요.
    } catch (e) {
      console.error("localStorage cleanup error:", e);
    }

    router.replace("/");
  };

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
              onClick={handleLogout}
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