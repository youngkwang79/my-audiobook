"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { useGameStore } from "@/app/lib/game/useGameStore"; // [수정] 게임 스토어 가져오기

export default function LayoutFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { syncToCloud } = useGameStore(); // [수정] 동기화 함수 추출

  const handleLogout = async () => {
    try {
      // 1. 로그아웃 전 서버에 데이터 즉시 저장 (가장 중요)
      console.log("데이터 동기화 중...");
      try {
        await syncToCloud(); 
      } catch (syncError) {
        console.error("로그아웃 중 클라우드 동기화 실패:", syncError);
      }

      // 2. 실제 로그아웃 실행
      await signOut();
      
      router.refresh();
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const showLogout =
    !!user &&
    (pathname === "/" ||
      pathname.startsWith("/work/") ||
      pathname.startsWith("/episode/") ||
      pathname === "/points" ||
      pathname === "/faq");

  return (
    <footer
      className="hide-in-fullscreen"
      style={{
        padding: "20px 16px 28px",
        textAlign: "center",
      }}
    >
      {showLogout && (
        <div
          style={{
            marginBottom: 10,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.65)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
            }}
          >
            로그아웃
          </button>
        </div>
      )}

      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.8,
        }}
      >
        <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
          개인정보처리방침
        </a>{" "}
        |{" "}
        <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
          이용약관
        </a>{" "}
        |{" "}
        <a href="/contact" style={{ color: "inherit", textDecoration: "none" }}>
          문의
        </a>{" "}
        |{" "}
        <a href="/about" style={{ color: "inherit", textDecoration: "none" }}>
          사이트소개
        </a>{" "}
        |{" "}
        <a href="/refund" style={{ color: "inherit", textDecoration: "none" }}>
          환불규정
        </a>
      </div>
    </footer>
  );
}