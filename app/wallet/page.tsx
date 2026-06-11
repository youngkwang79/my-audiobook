"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";

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

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
}

export default function WalletPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ✅ 테마 상태 추가
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {}
  }, []);
  const [coins, setCoins] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [autoNextEpisode, setAutoNextEpisode] = useState(true);
  const [openTab, setOpenTab] = useState<"charge" | "reward" | "use" | "payment" | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // 금액에 매핑된 지급 코인을 리턴하는 헬퍼 함수
  const getPointsForAmount = (amount: number) => {
    if (amount === 1090) return 700;
    if (amount === 10900) return 1200;
    if (amount === 14900) return 1400;
    if (amount === 39800) return 4000;
    return amount;
  };

  const loadTransactions = async (type: "charge" | "reward" | "use") => {
    setTxLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/me/wallet/transactions?type=${type}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.transactions) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (e) {
      console.error("거래 내역 로드 에러:", e);
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["SUCCESS", "CANCELLED"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data ?? []);
    } catch (e) {
      console.error("주문 내역 로드 에러:", e);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleTabToggle = (tab: "charge" | "reward" | "use" | "payment") => {
    if (openTab === tab) {
      setOpenTab(null);
      setTransactions([]);
      setOrders([]);
    } else {
      setOpenTab(tab);
      if (tab === "payment") {
        loadOrders();
      } else {
        loadTransactions(tab);
      }
    }
  };

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

  // 코인 잔액 불러오기
  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  // 환불 처리 함수
  const handleRefund = async (paymentId: string, amount: number) => {
    const pointsToDeduct = getPointsForAmount(amount);
    if (coins < pointsToDeduct) {
      alert(`보유 코인이 부족합니다. 환불을 위해서는 최소 ${pointsToDeduct} 코인이 필요합니다.`);
      return;
    }

    const reason = prompt("결제를 취소하시는 사유를 입력해 주세요. (예: 단순 변심, 오결제 등)");
    if (reason === null) return; // 취소 버튼 클릭 시

    try {
      const token = await getAccessToken();
      if (!token) {
        alert("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId,
          reason: reason.trim() || "고객 요청",
        }),
      });

      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        alert("결제 취소(환불)가 정상적으로 완료되었습니다.");
        await loadWallet();
        await loadOrders();
      } else {
        alert(`환불 실패: ${result?.error || "서버 응답 오류"}`);
      }
    } catch (err: any) {
      console.error("환불 에러:", err);
      alert("환불 요청 처리 중 에러가 발생했습니다: " + err.message);
    }
  };

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
    <main className={`wallet-main ${theme}`}>
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
          padding: 0 16px 80px;
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

        /* 거래 내역 박스 */
        .tx-list-container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 8px 16px;
          margin: 4px 0 12px;
          max-height: 240px;
          overflow-y: auto;
          animation: slideDown 0.25s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tx-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .tx-item:last-child {
          border-bottom: none;
        }

        .tx-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .tx-desc {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .tx-date {
          font-size: 11px;
          color: #8c8c96;
        }

        .tx-amount {
          font-size: 15px;
          font-weight: 700;
        }

        .tx-amount.charge {
          color: #10b981; /* emerald-500 */
        }

        .tx-amount.reward {
          color: #f59e0b; /* amber-500 */
        }

        .tx-amount.use {
          color: #ef4444; /* red-500 */
        }

        .tx-empty {
          padding: 24px 0;
          text-align: center;
          color: #8c8c96;
          font-size: 13px;
        }

        .wallet-menu-item.active {
          border-bottom-color: transparent;
        }

        .wallet-menu-item-right.rotated {
          transform: rotate(90deg);
          color: #ffffff;
        }

        .wallet-menu-item-right {
          transition: transform 0.2s ease, color 0.2s ease;
        }

        /* 라이트 모드 오버라이드 (가독성 보완) */
        .wallet-main.light {
          background: #f2f2f7 !important;
          color: #1c1c1e !important;
        }
        .wallet-main.light .wallet-header-title {
          color: #1c1c1e;
        }
        .wallet-main.light .wallet-back-btn {
          color: #1c1c1e;
        }
        .wallet-main.light .wallet-balance-label {
          color: #8e8e93;
        }
        .wallet-main.light .wallet-balance-value {
          color: #1c1c1e;
        }
        .wallet-main.light .wallet-divider {
          background: rgba(0, 0, 0, 0.08);
        }
        .wallet-main.light .wallet-menu-item {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          color: #1c1c1e;
        }
        .wallet-main.light .wallet-menu-item-label {
          color: #1c1c1e;
        }
        .wallet-main.light .wallet-menu-item-right {
          color: #c7c7cc;
        }
        .wallet-main.light .wallet-menu-item-right.rotated {
          color: #1c1c1e;
        }
        .wallet-main.light .toggle-label {
          color: #1c1c1e;
        }
        .wallet-main.light .toggle-track {
          background: #e5e5ea;
        }
        .wallet-main.light .toggle-track.on {
          background: linear-gradient(90deg, #ff2a5f 0%, #ff7a3c 100%);
        }
        .wallet-main.light .tx-list-container {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .wallet-main.light .tx-desc {
          color: #1c1c1e;
        }
        .wallet-main.light .tx-date {
          color: #8e8e93;
        }
        .wallet-main.light .tx-item {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .wallet-main.light .tx-empty {
          color: #8e8e93;
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
          {/* 충전 내역 */}
          <div>
            <button
              className={`wallet-menu-item ${openTab === "charge" ? "active" : ""}`}
              onClick={() => handleTabToggle("charge")}
            >
              <span className="wallet-menu-item-label">충전 내역</span>
              <div className={`wallet-menu-item-right ${openTab === "charge" ? "rotated" : ""}`}>
                <ChevronRightIcon />
              </div>
            </button>
            {openTab === "charge" && (
              <div className="tx-list-container">
                {txLoading ? (
                  <div className="tx-empty">불러오는 중...</div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-left">
                        <span className="tx-desc">{tx.description}</span>
                        <span className="tx-date">{formatDate(tx.created_at)}</span>
                      </div>
                      <span className="tx-amount charge">+{tx.amount} 코인</span>
                    </div>
                  ))
                ) : (
                  <div className="tx-empty">충전 내역이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          {/* 리워드 코인 내역 */}
          <div>
            <button
              className={`wallet-menu-item ${openTab === "reward" ? "active" : ""}`}
              onClick={() => handleTabToggle("reward")}
            >
              <span className="wallet-menu-item-label">리워드 코인</span>
              <div className={`wallet-menu-item-right ${openTab === "reward" ? "rotated" : ""}`}>
                <ChevronRightIcon />
              </div>
            </button>
            {openTab === "reward" && (
              <div className="tx-list-container">
                {txLoading ? (
                  <div className="tx-empty">불러오는 중...</div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-left">
                        <span className="tx-desc">{tx.description}</span>
                        <span className="tx-date">{formatDate(tx.created_at)}</span>
                      </div>
                      <span className="tx-amount reward">+{tx.amount} 코인</span>
                    </div>
                  ))
                ) : (
                  <div className="tx-empty">적립된 리워드 코인이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          {/* 사용 내역 */}
          <div>
            <button
              className={`wallet-menu-item ${openTab === "use" ? "active" : ""}`}
              onClick={() => handleTabToggle("use")}
            >
              <span className="wallet-menu-item-label">사용 내역</span>
              <div className={`wallet-menu-item-right ${openTab === "use" ? "rotated" : ""}`}>
                <ChevronRightIcon />
              </div>
            </button>
            {openTab === "use" && (
              <div className="tx-list-container">
                {txLoading ? (
                  <div className="tx-empty">불러오는 중...</div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="tx-item">
                      <div className="tx-left">
                        <span className="tx-desc">{tx.description}</span>
                        <span className="tx-date">{formatDate(tx.created_at)}</span>
                      </div>
                      <span className="tx-amount use">{tx.amount} 코인</span>
                    </div>
                  ))
                ) : (
                  <div className="tx-empty">사용 내역이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          {/* 결제 내역 (환불) */}
          <div>
            <button
              className={`wallet-menu-item ${openTab === "payment" ? "active" : ""}`}
              onClick={() => handleTabToggle("payment")}
            >
              <span className="wallet-menu-item-label">결제 내역 (환불)</span>
              <div className={`wallet-menu-item-right ${openTab === "payment" ? "rotated" : ""}`}>
                <ChevronRightIcon />
              </div>
            </button>
            {openTab === "payment" && (
              <div className="tx-list-container">
                {ordersLoading ? (
                  <div className="tx-empty">불러오는 중...</div>
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const pointsToDeduct = getPointsForAmount(Number(order.amount));
                    const isCoin = order.type === "coin" || (!order.payment_id.startsWith("m-") && !order.product_name.includes("멤버십"));
                    const canRefund = isCoin && order.status === "SUCCESS" && coins >= pointsToDeduct;

                    return (
                      <div key={order.id} className="tx-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", padding: "12px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="tx-left">
                            <span className="tx-desc">{order.product_name}</span>
                            <span className="tx-date">{formatDate(order.created_at)}</span>
                          </div>
                          <span className="tx-amount charge" style={{ color: order.status === "CANCELLED" ? "#8c8c96" : "#10b981" }}>
                            ₩{Number(order.amount).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                          <span
                            className={`status-badge ${order.status === "CANCELLED" ? "inactive" : ""}`}
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: order.status === "CANCELLED" ? "rgba(255,255,255,0.06)" : "rgba(16,185,129,0.1)",
                              color: order.status === "CANCELLED" ? "#8c8c96" : "#10b981",
                              fontWeight: "700"
                            }}
                          >
                            {order.status === "SUCCESS" ? "결제 완료" : "취소됨"}
                          </span>
                          {order.status === "SUCCESS" && (
                            isCoin ? (
                              canRefund ? (
                                <button
                                  onClick={() => handleRefund(order.payment_id, Number(order.amount))}
                                  style={{
                                    background: "rgba(255, 42, 95, 0.15)",
                                    border: "1px solid rgba(255, 42, 95, 0.3)",
                                    color: "#ff2a5f",
                                    borderRadius: "6px",
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    fontWeight: "800",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#ff2a5f";
                                    e.currentTarget.style.color = "#ffffff";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 42, 95, 0.15)";
                                    e.currentTarget.style.color = "#ff2a5f";
                                  }}
                                >
                                  환불하기
                                </button>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#8c8c96", fontWeight: "600" }}>
                                  코인 사용으로 환불 불가 ({pointsToDeduct} 코인 필요)
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: "11px", color: "#8c8c96", fontWeight: "600" }}>
                                멤버십 (해지만 가능)
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="tx-empty">결제 내역이 없습니다.</div>
                )}
              </div>
            )}
          </div>

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
        <BottomNav />
      </div>
    </main>
  );
}
