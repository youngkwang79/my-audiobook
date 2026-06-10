"use client";

import { requestPayment } from "@portone/browser-sdk/v2";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// 뒤로가기 아이콘
function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

// 📽️ 재생 아이콘
function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, color: "#8c8c96" }}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
    </svg>
  );
}

// 📥 다운로드 아이콘
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, color: "#ffffff" }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ⚡ 번개 아이콘
function ThunderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, color: "#ffe9a3" }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"></polygon>
    </svg>
  );
}

// 🌟 스파클 아이콘
function SparklesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, color: "#ffe9a3" }}>
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
      <path d="M10 8.5 L11.2 10.7 L13.5 11 L11.8 12.6 L12.2 15 L10 13.8 L7.8 15 L8.2 12.6 L6.5 11 L8.8 10.7 Z" fill="currentColor" />
    </svg>
  );
}

// Supabase 토큰 획득
async function getAccessToken() {
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

export default function PointsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);

  useEffect(() => {
    try {
      const plan = localStorage.getItem("membership");
      if (plan) setSubscribedPlan(plan);
    } catch (e) { }
  }, []);

  // 미로그인 시 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/points");
    }
  }, [loading, user, router]);

  // 지갑 포인트 로드
  const loadWallet = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch("/api/me/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setCurrentPoints(Number(data.points ?? 0) + Number(data.reward_points ?? 0));
      }
    } catch (e) {
      console.error("지갑 데이터 로딩 에러:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  // 복구 시 재조회
  const handleRestore = async () => {
    alert("구매 내역 복구를 요청했습니다. 잔액을 다시 불러옵니다.");
    await loadWallet();
  };

  // 코인 결제 (실제 confirm API에 매핑)
  // ⚡ 결제 함수 시작점
  const handlePurchaseCoin = async (amount: number, coinName: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      // 1. 포트원 결제창 띄우기 (심사 필수 요건)
      const paymentId = `coin-${crypto.randomUUID()}`;

      const response = await requestPayment({
        storeId: "store-본인의-상점아이디-입력", // 포트원 관리자에서 확인한 ID로 교체하세요
        paymentId: paymentId,
        orderName: `코인 충전: ${coinName}`,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });

      // 2. 결제창에서 취소하거나 실패했을 경우
      if (!response || response.code != null) {
        alert(`결제가 취소되었거나 실패했습니다: ${response?.message ?? "응답 없음"}`);
        return;
      }

      // 3. 결제 성공 시 서버 API 호출 (결제 검증 및 포인트 지급)
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, paymentId }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        await loadWallet();
        alert("충전이 완료되었습니다!");
      } else {
        alert(`충전 승인 처리 실패: ${data?.error || "알 수 없는 오류"}`);
      }
    } catch (e) {
      console.error(e);
      alert("결제 처리 중 에러가 발생했습니다.");
    }
  };
  // ⚡ 결제 함수 끝점

  // 멤버십 가입 결제 (Weekly / Annual)
  const handleSubscribeMembership = (plan: "weekly" | "annual", planName: string, price: number) => {
    try {
      const proceed = confirm(
        "🍵 [작가 후원 동의 및 안내]\n\n\"소중한 후원에 진심으로 감사드립니다! 독자님이 보내주신 따뜻한 지지와 성원은 창작자에게 가장 큰 힘이 됩니다. 더 깊이 있고 몰입감 넘치는 오디오북 스토리로 보답하겠습니다.\"\n\n※ 본 멤버십은 자발적인 작가 후원 상품으로, 결제 완료와 동시에 혜택이 즉시 개시(감상 권한 활성화)되어 이후 취소 및 환불이 불가능하오니 신중한 후원 결정을 부탁드립니다.\n\n동의하고 후원을 진행하시겠습니까?"
      );
      if (!proceed) return;

      localStorage.setItem("membership", plan);
      alert(
        `[가상 결제 완료]\n(추후 토스페이먼츠 결제 연동이 진행될 예정입니다)\n\n${planName} 가입이 완료되었습니다!\n이제 작가님을 후원하며 모든 에피소드를 감상하실 수 있습니다.`
      );
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("멤버십 결제 처리 중 문제가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#0d0d0f", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span>불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="store-bg">
      <style>{`
        .store-bg {
          min-height: 100dvh;
          background: linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.92)), url("/background.jpg") center / cover no-repeat fixed;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding-bottom: calc(40px + env(safe-area-inset-bottom));
        }

        .store-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-sizing: border-box;
        }

        /* 헤더 영역 */
        .store-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 48px;
        }

        .back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .store-title {
          font-size: 18px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .restore-btn {
          background: none;
          border: none;
          color: #8c8c96;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          padding: 4px;
        }

        /* 섹션 공통 */
        .section-label {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }

        /* 코인 충전 그리드 */
        .coin-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .coin-card {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
          text-align: left;
          width: 100%;
          box-sizing: border-box;
        }

        .coin-card:active {
          transform: scale(0.98);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .coin-amount-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .coin-yellow-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fca834;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 2px 5px rgba(252, 168, 52, 0.4);
          flex-shrink: 0;
        }

        .coin-text-main {
          font-size: 17px;
          font-weight: 850;
          color: #ffffff;
        }

        .coin-text-bonus {
          font-size: 12px;
          color: #8c8c96;
          font-weight: 600;
        }

        .coin-price {
          font-size: 14px;
          color: #8c8c96;
          font-weight: 700;
          margin: 0;
        }

        /* 멤버십 섹션 */
        .membership-section-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .membership-vip-card {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s, border-color 0.2s;
          box-sizing: border-box;
          width: 100%;
          text-align: left;
        }

        .membership-vip-card.weekly-card {
          border: 1.5px solid #fca834;
          box-shadow: 0 4px 15px rgba(252, 168, 52, 0.18);
        }

        .membership-vip-card.annual-card {
          border: 1.5px solid rgba(255, 255, 255, 0.10);
        }

        .membership-vip-card:active {
          transform: scale(0.98);
        }

        .membership-badge-red {
          position: absolute;
          top: -10px;
          right: 16px;
          background: #ff2a5f;
          color: #ffffff;
          font-size: 10px;
          font-weight: 850;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(255, 42, 95, 0.4);
        }

        .membership-card-top {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .membership-card-label {
          font-size: 14px;
          font-weight: 750;
          color: #fca834;
          margin: 0;
        }

        .membership-card-label.annual-label {
          color: #ff527b;
        }

        .membership-card-price-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .membership-card-price {
          font-size: 24px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
        }

        .membership-card-period {
          font-size: 14px;
          font-weight: 700;
          color: #8c8c96;
        }

        .membership-card-caption {
          font-size: 12px;
          color: #8c8c96;
          font-weight: 550;
          margin: 4px 0 0 0;
        }

        /* 혜택 2x2 그리드 */
        .membership-benefits-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 14px;
        }

        .benefit-card-item {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
        }

        .benefit-card-item.disabled {
          text-decoration: line-through;
          color: #5b5b66;
        }

        /* 이용약관 */
        .info-section {
          margin-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 20px;
        }

        .info-link {
          font-size: 13px;
          font-weight: 700;
          color: #8c8c96;
          text-decoration: underline;
          cursor: pointer;
          display: inline-block;
          margin-bottom: 12px;
        }

        .info-paragraph {
          font-size: 12.5px;
          line-height: 1.6;
          color: #8c8c96;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* 골드 유리창 반사 (Shine) 효과 */
        .gold-shine-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(212, 162, 60, 0.08) 0%, rgba(212, 162, 60, 0.02) 100%) !important;
          border: 1.5px solid rgba(212, 162, 60, 0.45) !important;
          box-shadow: 0 6px 20px rgba(212, 162, 60, 0.12) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .gold-shine-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.15) 30%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0.15) 70%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
          animation: shine-animation 3.5s infinite ease-in-out;
          pointer-events: none;
        }

        @keyframes shine-animation {
          0% { left: -70%; }
          16% { left: 120%; }
          100% { left: 120%; }
        }
      `}</style>

      <div className="store-container">
        {/* 헤더 */}
        <div className="store-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowLeftIcon />
          </button>
          <h1 className="store-title">무림북 스토어</h1>
          <button className="restore-btn" onClick={handleRestore}>
            복구
          </button>
        </div>

        {/* 1. 코인 충전 그리드 */}
        <div>
          <h2 className="section-label">코인</h2>
          <div className="coin-grid">
            <button className="coin-card gold-shine-card" onClick={() => handlePurchaseCoin(990, "100 + 600 코인")}>
              <div className="coin-amount-row">
                <span className="coin-yellow-icon">P</span>
                <span className="coin-text-main">100</span>
                <span className="coin-text-bonus">+ 600</span>
              </div>
              <p className="coin-price">₩990</p>
            </button>

            <button className="coin-card" onClick={() => handlePurchaseCoin(10900, "700 + 500 코인")}>
              <div className="coin-amount-row">
                <span className="coin-yellow-icon">P</span>
                <span className="coin-text-main">700</span>
                <span className="coin-text-bonus">+ 500</span>
              </div>
              <p className="coin-price">₩10,900</p>
            </button>

            <button className="coin-card" onClick={() => handlePurchaseCoin(14900, "1000 + 400 코인")}>
              <div className="coin-amount-row">
                <span className="coin-yellow-icon">P</span>
                <span className="coin-text-main">1000</span>
                <span className="coin-text-bonus">+ 400</span>
              </div>
              <p className="coin-price">₩14,900</p>
            </button>

            <button className="coin-card" onClick={() => handlePurchaseCoin(39800, "2500 + 1500 코인")}>
              <div className="coin-amount-row">
                <span className="coin-yellow-icon">P</span>
                <span className="coin-text-main">2500</span>
                <span className="coin-text-bonus">+ 1500</span>
              </div>
              <p className="coin-price">₩39,800</p>
            </button>
          </div>
        </div>

        {/* 2. 멤버십 섹션 */}
        <div>
          <h2 className="section-label">멤버십</h2>
          <div className="membership-section-wrap">

            {/* 주간 멤버십 */}
            <div
              className="membership-vip-card weekly-card gold-shine-card"
              onClick={() => handleSubscribeMembership("weekly", "주간 멤버십: 작가에게 커피한잔!", 3000)}
            >
              <div className="membership-card-top">
                <span className="membership-card-label">
                  {subscribedPlan === "weekly" ? "작가에게 커피한잔 후원중💖" : "멤버십 (작가에게 커피한잔!)"}
                </span>
                <div className="membership-card-price-row">
                  <span className="membership-card-price">₩3,000</span>
                  <span className="membership-card-period">/주</span>
                </div>
                <p className="membership-card-caption">자동 갱신 · 언제든지 해지 가능</p>
              </div>

              {/* 혜택 2x2 */}
              <div className="membership-benefits-grid">
                <div className="benefit-card-item">
                  <PlayIcon />
                  <span>완결작 무료 청취</span>
                </div>
                <div className="benefit-card-item">
                  <DownloadIcon />
                  <span>다운로드</span>
                </div>
                <div className="benefit-card-item">
                  <ThunderIcon />
                  <span>창작 동력 급상승</span>
                </div>
                <div className="benefit-card-item">
                  <SparklesIcon />
                  <span>전용 콘텐츠 청취</span>
                </div>
              </div>
            </div>

            {/* 연간 멤버십 */}
            <div
              className="membership-vip-card annual-card"
              onClick={() => handleSubscribeMembership("annual", "연간 멤버십: 작가에게 따뜻한 국밥 한그릇!", 99900)}
            >
              <span className="membership-badge-red">기간 한정 할인</span>

              <div className="membership-card-top">
                <span className="membership-card-label annual-label">
                  {subscribedPlan === "annual" || subscribedPlan === "yearly" ? "작가에게 따뜻한 국밥 후원중💖" : "멤버십 (작가에게 따뜻한 국밥 한그릇!)"}
                </span>
                <div className="membership-card-price-row">
                  <span className="membership-card-price">₩99,900</span>
                  <span className="membership-card-period">/년</span>
                </div>
                <p className="membership-card-caption">자동 갱신 · 언제든지 해지 가능</p>
              </div>

              {/* 혜택 2x2 */}
              <div className="membership-benefits-grid">
                <div className="benefit-card-item">
                  <PlayIcon />
                  <span>완결작 무료 청취</span>
                </div>
                <div className="benefit-card-item">
                  <DownloadIcon />
                  <span>다운로드</span>
                </div>
                <div className="benefit-card-item">
                  <ThunderIcon />
                  <span>창작 동력 급상승</span>
                </div>
                <div className="benefit-card-item">
                  <SparklesIcon />
                  <span>전용 콘텐츠 청취</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. 충전 안내 */}
        <div className="info-section">
          <h2 className="section-label">충전 안내</h2>
          <span className="info-link" onClick={() => alert("서비스 이용약관으로 이동합니다.")}>
            서비스 이용약관 및 개인정보 처리방침
          </span>
          <div className="info-paragraph">
            <span>1. 무림북에는 무료 및 유료 콘텐츠가 포함되어 있습니다.</span>
            <span>2. 유료 콘텐츠는 코인을 사용해 잠금 해제하거나, 멤버십 구독을 통해 시청할 수 있습니다. 단, 멤버십 전용 콘텐츠는 멤버십 구독으로만 시청가능합니다.</span>
            <span>3. 회차 잠금 해제 시 충전된 포인트가 우선 사용되며, 부족할 경우 보너스 포인트가 자동으로 사용됩니다. (준비중)</span>
            <span>4. 작가를 후원하시는 기간동안 홈페이지 내 모든 콘텐츠를 무제한으로 청취하실 수 있습니다.</span>
            <span>5. 멤버십은 현재 구독 기간이 종료되기 24시간 전에 자동으로 갱신되며, 결제 계정을 통해 결제가 진행됩니다.</span>
            <span>6. 자동 갱신을 원하지 않으실 경우, 구독 기간 종료 최소 24시간 전에 설정에서 해지해 주세요.</span>
            <span>7. 충전 또는 결제 후에도 잔액이 변하지 않을 경우, [복구] 버튼을 클릭해 새로 고침해 주세요.</span>
            <span>8. 기타 문의 사항은 [내정보] &gt; [고객문의(1:1 문의)]를 통해 문의해 주세요.</span>
            <span>9. 무림북의 멤버십 가입은 문극_태양 작가에게 후원하는 것이므로 교환 및 환불이 불가능합니다. 소설을 즐겨주시고 마음으로 후원 해 주시면 감사하겠습니다.</span>
          </div>
        </div>

      </div>
    </main>
  );
}