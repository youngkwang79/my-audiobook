"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { useGameStore } from "@/app/lib/game/useGameStore";

export default function LayoutFooter() {
  // 사용하지 않는 hook들은 삭제해도 좋지만, 
  // 코드 구조를 유지하기 위해 그대로 두었습니다.
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { syncToCloud } = useGameStore();

  // 로그아웃 관련 로직(handleLogout, showLogout 등)은 모두 삭제합니다.

  return (
    <footer
      className="hide-in-fullscreen"
      style={{
        padding: "20px 16px 28px",
        textAlign: "center",
      }}
    >
      {/* 로그아웃 버튼 영역이 제거되었습니다 */}

      {/* 약관 링크 영역 */}
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.8,
        }}
      >
        <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>개인정보처리방침</a>{" "}
        |{" "}
        <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>이용약관</a>{" "}
        |{" "}
        <a href="/contact" style={{ color: "inherit", textDecoration: "none" }}>문의</a>{" "}
        |{" "}
        <a href="/about" style={{ color: "inherit", textDecoration: "none" }}>사이트소개</a>{" "}
        |{" "}
        <a href="/refund" style={{ color: "inherit", textDecoration: "none" }}>환불규정</a>
      </div>

      {/* 사업자 정보 영역 */}
      <div
        style={{
          marginTop: 20,
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          lineHeight: 1.6,
        }}
      >
        상호명: 오늘의 살롱 (간이과세자) | 사업자등록번호: 592-78-00172 | 대표자명: 고영광<br />
        사업장 주소: 서울시 송파구 문정도 76-2 101호 | 전화번호: 02)6013-2299<br />
        통신판매업 신고번호: 2019-서울송파-0635<br />
        모든 거래에 대한 책임과 환불, 소비자 민원 등은 오늘의살롱에서 진행합니다.<br />
        고객지원 및 환불문의: 고영광 (02-6013-2299, sun_writer@murimbook.com)<br />
        <br />
        © 2026 오늘의살롱 All rights reserved.
      </div>
    </footer>
  );
}