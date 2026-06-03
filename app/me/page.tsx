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
  const { user, session, loading, signOut } = useAuth();
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);
  const [remainingMissions, setRemainingMissions] = useState<number | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newAllowNotifications, setNewAllowNotifications] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);

  useEffect(() => {
    if (user && !user.user_metadata?.nickname) {
      setShowNicknameModal(true);
      const socialName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setNewNickname(socialName);
    } else {
      setShowNicknameModal(false);
    }
  }, [user]);

  // 남은 미션 개수 불러오기
  const loadRemainingMissions = async () => {
    try {
      const token = session?.access_token;
      if (!token) {
        setRemainingMissions(null);
        return;
      }

      const res = await fetch("/api/me/tasks", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.completedTasks) {
        const completed: string[] = data.completedTasks;
        
        // 오늘 날짜 포맷
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        // 대상 미션들
        const missions = [
          "checkin_" + todayStr,
          "youtube",
          "watch5_" + todayStr,
          "watch10_" + todayStr,
          "watch15_" + todayStr,
          "share_" + todayStr
        ];

        const incompleteCount = missions.filter(m => !completed.includes(m)).length;
        setRemainingMissions(incompleteCount);
      } else {
        setRemainingMissions(null);
      }
    } catch (e) {
      console.error("미션 개수 로드 에러:", e);
      setRemainingMissions(null);
    }
  };

  // 지갑 잔액 불러오기
  const loadWallet = async () => {
    try {
      const token = session?.access_token;
      if (!token) {
        setCurrentPoints(null);
        return;
      }

      const refCode = localStorage.getItem("referral_code");
      const url = refCode ? `/api/me/wallet?ref=${refCode}` : `/api/me/wallet`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setCurrentPoints(Number(data.points ?? 0) + Number(data.reward_points ?? 0));
        if (refCode) {
          localStorage.removeItem("referral_code");
        }
      } else {
        setCurrentPoints(null);
      }
    } catch (error) {
      console.error("지갑 데이터 불러오기 에러:", error);
      setCurrentPoints(null);
    }
  };

  useEffect(() => {
    if (user && session) {
      loadWallet();
      loadRemainingMissions();
    } else {
      setCurrentPoints(null);
      setRemainingMissions(null);
    }
  }, [user, session]);

  // 에피소드 오픈 등으로 코인 변동 시 지갑 잔액 및 미션 개수 갱신 리스너
  useEffect(() => {
    const handleWalletUpdate = () => {
      if (user && session) {
        loadWallet();
        loadRemainingMissions();
      }
    };
    window.addEventListener("wallet-updated", handleWalletUpdate);
    return () => {
      window.removeEventListener("wallet-updated", handleWalletUpdate);
    };
  }, [user, session]);

  useEffect(() => {
    try {
      const plan = localStorage.getItem("membership");
      if (plan) setSubscribedPlan(plan);
    } catch (e) {}
  }, []);

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
  const displayName = user?.user_metadata?.nickname || (user?.email ? user.email.split("@")[0] : "고영광");
  const displayId = user?.id ? user.id.slice(0, 8) : "333418883";
  const displayCoins = currentPoints !== null ? currentPoints : 0;

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
            <h3 className="membership-banner-title">
              {subscribedPlan === "weekly"
                ? "작가에게 커피한잔 후원중💖"
                : subscribedPlan === "annual" || subscribedPlan === "yearly"
                ? "작가에게 따뜻한 국밥 후원중💖"
                : "멤버십 가입하기"}
            </h3>
            {!subscribedPlan && <p className="membership-banner-desc">멤버십 전용 혜택을 누려보세요:</p>}
          </div>
          {!subscribedPlan && (
            <button className="membership-banner-btn" onClick={(e) => {
              e.stopPropagation();
              handleMembershipRedirect();
            }}>
              가입
            </button>
          )}
        </div>

        {/* 메뉴 그룹 1 */}
        <div className="menu-group-box">
          <button className="menu-item" onClick={handlePointsRedirect}>
            <span className="menu-item-left">바로 충전</span>
            <div className="menu-item-right">
              {subscribedPlan && (
                <span style={{ fontSize: "12px", color: "#ff2a5f", marginRight: "4px", fontWeight: "600" }}>
                  멤버십 이용중
                </span>
              )}
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/wallet")}>
            <span className="menu-item-left">내 지갑</span>
            <div className="menu-item-right">
              <CoinIcon />
              <span className="menu-coin-text">{displayCoins}</span>
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/checkin")}>
            <span className="menu-item-left">출석체크 / 무료 코인 받기</span>
            <div className="menu-item-right">
              {remainingMissions !== null && remainingMissions > 0 && (
                <span className="menu-badge">+{remainingMissions}</span>
              )}
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/works?tab=시청 기록")}>
            <span className="menu-item-left">시청 기록</span>
            <div className="menu-item-right">
              <span className="menu-arrow"><ChevronRightIcon /></span>
            </div>
          </button>

          <button className="menu-item" onClick={() => router.push("/works?tab=다운로드")}>
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

      {/* 닉네임 설정 모달 (소셜 가입자 및 미설정자용) */}
      {showNicknameModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#16161e",
              border: "1px solid rgba(255, 215, 120, 0.25)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              닉네임 설정
            </h3>
            
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              댓글과 프로필에서 이메일 대신 노출될<br />닉네임을 설정해 주세요.
            </p>

            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="닉네임 (2자 이상)"
              type="text"
              maxLength={20}
              disabled={modalBusy}
              style={{
                padding: "14px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
                fontSize: 15,
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
                fontSize: "13.5px",
                color: "rgba(255,255,255,0.85)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={newAllowNotifications}
                onChange={(e) => setNewAllowNotifications(e.target.checked)}
                disabled={modalBusy}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#E6D3A3",
                  cursor: "pointer",
                }}
              />
              <span>신규 업데이트 알림 받기 (모바일 푸시)</span>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button
                onClick={async () => {
                  if (newNickname.trim().length < 2) {
                    alert("닉네임은 2자 이상 입력해 주세요.");
                    return;
                  }
                  setModalBusy(true);
                  try {
                    const { error } = await supabase.auth.updateUser({
                      data: {
                        nickname: newNickname.trim(),
                        allow_notifications: newAllowNotifications,
                      },
                    });
                    if (error) throw error;
                    alert("설정이 저장되었습니다!");
                    setShowNicknameModal(false);
                    window.location.reload();
                  } catch (err: any) {
                    alert(`저장 실패: ${err.message}`);
                  } finally {
                    setModalBusy(false);
                  }
                }}
                disabled={modalBusy || newNickname.trim().length < 2}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%)",
                  color: "#2b1d00",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: modalBusy || newNickname.trim().length < 2 ? "not-allowed" : "pointer",
                  opacity: modalBusy || newNickname.trim().length < 2 ? 0.6 : 1,
                }}
              >
                {modalBusy ? "저장 중..." : "저장 완료"}
              </button>

              <button
                onClick={() => {
                  const randomNum = Math.floor(1000 + Math.random() * 9000);
                  const fallbackNick = `독자_${randomNum}`;
                  supabase.auth.updateUser({
                    data: {
                      nickname: fallbackNick,
                      allow_notifications: false
                    }
                  }).then(() => {
                    setShowNicknameModal(false);
                    window.location.reload();
                  });
                }}
                disabled={modalBusy}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                나중에 하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 내비게이션 */}
      <BottomNav />
    </main>
  );
}