"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";

// 설정 기어 아이콘
function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

// 복사 아이콘
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

// 꺾쇠 오른쪽 아이콘
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

// 노란색 코인 아이콘
function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 2 }}>
      <circle cx="12" cy="12" r="10" fill="#fca834" />
      <circle cx="12" cy="12" r="7" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      <text x="12" y="15" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">P</text>
    </svg>
  );
}

// Supabase 액세스 토큰 획득
async function getAccessToken() {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return null;
  return session?.access_token ?? null;
}

export default function MePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 지갑 잔액 불러오기
  const loadWallet = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setCurrentPoints(null);
        return;
      }

      const res = await fetch("/api/me/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setCurrentPoints(Number(data.points ?? 0));
      }
    } catch (error) {
      console.error("지갑 데이터 불러오기 에러:", error);
      setCurrentPoints(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadWallet();
    } else {
      setCurrentPoints(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsSettingsOpen(false);
      router.replace("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃 중 문제가 발생했습니다.");
    }
  };

  const handleCopyId = () => {
    try {
      const targetId = user?.id ? user.id.slice(0, 8) : "333418883";
      navigator.clipboard.writeText(targetId);
      alert(`ID ${targetId} 가 클립보드에 복사되었습니다.`);
    } catch (e) {
      alert("ID 복사 중 문제가 발생했습니다.");
    }
  };

  const handlePointsRedirect = () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    router.push("/points");
  };

  const handleMembershipRedirect = () => {
    router.push("/membership");
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000000", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span>불러오는 중...</span>
      </main>
    );
  }

  // 화면 렌더링에 사용할 유저 정보
  const displayName = user?.email ? user.email.split("@")[0] : "고영광";
  const displayId = user?.id ? user.id.slice(0, 8) : "333418883";
  const displayCoins = currentPoints !== null ? currentPoints : 884;

  return (
    <main className="me-main-bg">
      <style>{`
        .me-main-bg {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding-bottom: calc(80px + env(safe-area-inset-bottom));
        }

        .me-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        }

        /* 헤더 영역 */
        .me-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          height: 44px;
        }

        .settings-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          transition: transform 0.2s;
        }

        .settings-btn:active {
          transform: scale(0.9);
        }

        /* 프로필 영역 */
        .profile-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: -10px;
        }

        .profile-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .profile-avatar-text {
          color: #333333;
          font-size: 8px;
          font-weight: 800;
          line-height: 1.25;
          text-align: center;
          word-break: keep-all;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .profile-name {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .profile-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #8c8c96;
          font-weight: 600;
        }

        .copy-btn {
          background: none;
          border: none;
          color: #8c8c96;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 2px;
          margin-left: 2px;
          vertical-align: middle;
        }

        .profile-divider {
          color: rgba(255, 255, 255, 0.15);
        }

        /* 멤버십 배너 */
        .membership-banner {
          background: #ff2a5f;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          text-decoration: none;
          margin-top: 10px;
        }

        .membership-banner:active {
          transform: scale(0.98);
        }

        .membership-banner-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .membership-banner-title {
          font-size: 18px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .membership-banner-desc {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          font-weight: 550;
        }

        .membership-banner-btn {
          background: #ffffff;
          color: #ff2a5f;
          font-size: 14px;
          font-weight: 850;
          padding: 8px 18px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* 메뉴 그룹 박스 */
        .menu-group-box {
          background: #16161e;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
        }

        .menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 58px;
          color: #ffffff;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          width: 100%;
        }

        .menu-item:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .menu-item-left {
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .menu-item-right {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8c8c96;
        }

        .menu-coin-text {
          font-size: 15px;
          font-weight: 800;
          color: #fca834;
        }

        .menu-badge {
          background: #ff2a5f;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 12px;
          letter-spacing: -0.2px;
        }

        .menu-right-text {
          font-size: 14px;
          font-weight: 600;
          color: #8c8c96;
        }

        .menu-arrow {
          display: flex;
          align-items: center;
          color: #55555d;
        }

        /* 바텀 시트 (설정 모달) */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 100000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .modal-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        .bottom-sheet {
          width: 100%;
          max-width: 480px;
          background: #16161e;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-overlay.active .bottom-sheet {
          transform: translateY(0);
        }

        .sheet-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .sheet-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .sheet-btn:active {
          background: rgba(255, 255, 255, 0.1);
        }

        .sheet-btn.danger {
          color: #ff5252;
          background: rgba(255, 82, 82, 0.08);
          border-color: rgba(255, 82, 82, 0.15);
        }

        .sheet-btn.danger:active {
          background: rgba(255, 82, 82, 0.15);
        }

        .sheet-close-btn {
          width: 100%;
          background: #ffffff;
          color: #000000;
          font-size: 15px;
          font-weight: 800;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          border: none;
          margin-top: 8px;
        }
      `}</style>

      <div className="me-container">
        {/* 헤더 */}
        <div className="me-header">
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
            <GearIcon />
          </button>
        </div>

        {/* 프로필 */}
        <div className="profile-section">
          <div className="profile-avatar">
            <span className="profile-avatar-text">
              생각하는대로<br />살지않으면<br />사는대로<br />생각하게<br />된다
            </span>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{displayName}</h2>
            <div className="profile-meta">
              <span>ID {displayId}</span>
              <button className="copy-btn" onClick={handleCopyId} title="ID 복사">
                <CopyIcon />
              </button>
              <span className="profile-divider">|</span>
              <span>팔로잉 0</span>
            </div>
          </div>
        </div>

        {/* 멤버십 배너 */}
        <div className="membership-banner" onClick={handleMembershipRedirect}>
          <div className="membership-banner-left">
            <h3 className="membership-banner-title">멤버십 가입하기</h3>
            <p className="membership-banner-desc">멤버십 전용 혜택을 누려보세요:</p>
          </div>
          <button className="membership-banner-btn" onClick={(e) => {
            e.stopPropagation();
            handleMembershipRedirect();
          }}>
            가입
          </button>
        </div>

        {/* 메뉴 그룹 1 */}
        <div className="menu-group-box">
          <button className="menu-item" onClick={handlePointsRedirect}>
            <span className="menu-item-left">바로 충전</span>
            <div className="menu-item-right">
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={handlePointsRedirect}>
            <span className="menu-item-left">내 지갑</span>
            <div className="menu-item-right">
              <CoinIcon />
              <span className="menu-coin-text">{displayCoins}</span>
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => alert("인센티브 센터 준비중입니다.")}>
            <span className="menu-item-left">인센티브 센터</span>
            <div className="menu-item-right">
              <span className="menu-badge">+10</span>
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => alert("시청 기록이 없습니다.")}>
            <span className="menu-item-left">시청 기록</span>
            <div className="menu-item-right">
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => alert("다운로드는 멤버십 회원만 가능합니다.")}>
            <span className="menu-item-left">다운로드</span>
            <div className="menu-item-right">
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>
        </div>

        {/* 메뉴 그룹 2 */}
        <div className="menu-group-box">
          <button className="menu-item" onClick={() => alert("현재 한국어만 지원합니다.")}>
            <span className="menu-item-left">언어</span>
            <div className="menu-item-right">
              <span className="menu-right-text">한국어</span>
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => alert("고객 센터 문의: support@murimbook.com")}>
            <span className="menu-item-left">고객 센터</span>
            <div className="menu-item-right">
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>
        </div>
      </div>

      {/* 설정 모달 (바텀 시트) */}
      <div className={`modal-overlay ${isSettingsOpen ? "active" : ""}`} onClick={() => setIsSettingsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <h4 className="sheet-title">계정 설정</h4>
          
          {user ? (
            <>
              <button className="sheet-btn" onClick={() => {
                setIsSettingsOpen(false);
                router.push("/me/change-password");
              }}>
                비밀번호 변경
              </button>
              <button className="sheet-btn" onClick={() => {
                setIsSettingsOpen(false);
                router.push("/me/change-email");
              }}>
                이메일 변경
              </button>
              <button className="sheet-btn danger" onClick={handleSignOut}>
                로그아웃
              </button>
              <button className="sheet-btn danger" onClick={() => {
                if (confirm("정말 탈퇴하시겠습니까? 데이터는 복구되지 않습니다.")) {
                  alert("서비스 탈퇴가 처리되었습니다.");
                  handleSignOut();
                }
              }}>
                계정 탈퇴하기
              </button>
            </>
          ) : (
            <button className="sheet-btn" onClick={() => {
              setIsSettingsOpen(false);
              router.push("/login");
            }}>
              로그인하러 가기
            </button>
          )}

          <button className="sheet-close-btn" onClick={() => setIsSettingsOpen(false)}>
            닫기
          </button>
        </div>
      </div>

      {/* 하단 내비게이션 */}
      <BottomNav />
    </main>
  );
}