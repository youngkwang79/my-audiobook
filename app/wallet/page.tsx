"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// 뒤로가기 아이콘
function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
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

export default function WalletPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [coins, setCoins] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [autoNextEpisode, setAutoNextEpisode] = useState(true);

  // 코인 잔액 불러오기
  useEffect(() => {
    const loadWallet = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/me/wallet", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setCoins(Number(data.points ?? 0));
          setRewardCoins(Number(data.reward_points ?? 0));
        }
      } catch (e) {
        console.error("지갑 로드 오류:", e);
      }
    };

    if (user) {
      loadWallet();
    }
  }, [user]);

  // 다음화 자동해제 상태 로컬스토리지 동기화
  useEffect(() => {
    try {
      const saved = localStorage.getItem("autoNextEpisode");
      if (saved !== null) {
        setAutoNextEpisode(saved === "true");
      }
    } catch (e) {
      // 무시
    }
  }, []);

  const handleToggleAutoNext = () => {
    const next = !autoNextEpisode;
    setAutoNextEpisode(next);
    try {
      localStorage.setItem("autoNextEpisode", String(next));
    } catch (e) {
      // 무시
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000000", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span>불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="wallet-main">
      <style>{`
        .wallet-main {
          min-height: 100dvh;
          background: #000000;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
        }

        .wallet-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 0 16px 40px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* 헤더 */
        .wallet-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 52px;
        }

        .wallet-back-btn {
          position: absolute;
          left: 0;
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }

        .wallet-header-title {
          font-size: 17px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        /* 잔액 영역 */
        .wallet-balance-section {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 48px;
          padding: 32px 0 28px;
        }

        .wallet-balance-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .wallet-balance-label {
          font-size: 13px;
          color: #8c8c96;
          font-weight: 600;
          letter-spacing: -0.2px;
        }

        .wallet-balance-value {
          font-size: 36px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -1px;
          line-height: 1;
        }

        /* 바로 충전 버튼 */
        .charge-btn {
          width: 100%;
          height: 52px;
          background: linear-gradient(90deg, #ff2a5f 0%, #ff7a3c 100%);
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          border: none;
          border-radius: 28px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 16px rgba(255, 42, 95, 0.35);
          letter-spacing: -0.3px;
          margin-top: 4px;
        }

        .charge-btn:active {
          transform: scale(0.98);
          opacity: 0.95;
        }

        /* 구분선 */
        .wallet-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 28px 0 0;
        }

        /* 메뉴 리스트 */
        .wallet-menu-list {
          display: flex;
          flex-direction: column;
        }

        .wallet-menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 58px;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #ffffff;
          cursor: pointer;
          padding: 0;
          text-align: left;
          width: 100%;
          transition: background-color 0.15s;
        }

        .wallet-menu-item:last-child {
          border-bottom: none;
        }

        .wallet-menu-item-label {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .wallet-menu-item-right {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #55555d;
        }

        /* 토글 스위치 */
        .toggle-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 58px;
          border-bottom: none;
        }

        .toggle-label {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .toggle-switch {
          position: relative;
          width: 51px;
          height: 31px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .toggle-track {
          position: absolute;
          inset: 0;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.15);
          transition: background 0.25s;
          cursor: pointer;
        }

        .toggle-track.on {
          background: linear-gradient(90deg, #ff2a5f 0%, #ff7a3c 100%);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toggle-thumb.on {
          transform: translateX(20px);
        }
      `}</style>

      <div className="wallet-container">
        {/* 헤더 */}
        <div className="wallet-header">
          <button className="wallet-back-btn" onClick={() => router.back()}>
            <ChevronLeftIcon />
          </button>
          <h1 className="wallet-header-title">내 지갑</h1>
        </div>

        {/* 잔액 표시 */}
        <div className="wallet-balance-section">
          <div className="wallet-balance-item">
            <span className="wallet-balance-label">코인</span>
            <span className="wallet-balance-value">{coins}</span>
          </div>
          <div className="wallet-balance-item">
            <span className="wallet-balance-label">리워드 코인</span>
            <span className="wallet-balance-value">{rewardCoins}</span>
          </div>
        </div>

        {/* 바로 충전 버튼 */}
        <button
          className="charge-btn"
          onClick={() => router.push("/points")}
        >
          바로 충전
        </button>

        {/* 구분선 */}
        <div className="wallet-divider" />

        {/* 메뉴 리스트 */}
        <div className="wallet-menu-list">
          <button
            className="wallet-menu-item"
            onClick={() => alert("충전 내역 기능 준비중입니다.")}
          >
            <span className="wallet-menu-item-label">충전 내역</span>
            <div className="wallet-menu-item-right">
              <ChevronRightIcon />
            </div>
          </button>

          <button
            className="wallet-menu-item"
            onClick={() => alert("리워드 코인 기능 준비중입니다.")}
          >
            <span className="wallet-menu-item-label">리워드 코인</span>
            <div className="wallet-menu-item-right">
              <ChevronRightIcon />
            </div>
          </button>

          <button
            className="wallet-menu-item"
            onClick={() => alert("사용 내역 기능 준비중입니다.")}
          >
            <span className="wallet-menu-item-label">사용 내역</span>
            <div className="wallet-menu-item-right">
              <ChevronRightIcon />
            </div>
          </button>

          {/* 다음 화 자동 해제 토글 */}
          <div className="toggle-wrapper">
            <span className="toggle-label">다음 화 자동 해제</span>
            <label className="toggle-switch" onClick={handleToggleAutoNext}>
              <div className={`toggle-track ${autoNextEpisode ? "on" : ""}`}>
                <div className={`toggle-thumb ${autoNextEpisode ? "on" : ""}`} />
              </div>
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
