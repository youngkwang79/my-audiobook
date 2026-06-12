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
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "KAKAOPAY" | "PHONE">("CARD");
  const [pendingPurchase, setPendingPurchase] = useState<{ type: "coin"; amount: number; coinName: string } | null>(null);
  const [allAgreed, setAllAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [financialAgreed, setFinancialAgreed] = useState(false);
  const [purchaseAgreed, setPurchaseAgreed] = useState(false);
  const [showDetailSection, setShowDetailSection] = useState<"privacy" | "financial" | "purchase" | null>(null);

  const handleAgreeAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAllAgreed(checked);
    setPrivacyAgreed(checked);
    setFinancialAgreed(checked);
    setPurchaseAgreed(checked);
  };

  const handleIndividualAgree = (type: "privacy" | "financial" | "purchase", checked: boolean) => {
    let p = privacyAgreed;
    let f = financialAgreed;
    let u = purchaseAgreed;

    if (type === "privacy") {
      setPrivacyAgreed(checked);
      p = checked;
    } else if (type === "financial") {
      setFinancialAgreed(checked);
      f = checked;
    } else if (type === "purchase") {
      setPurchaseAgreed(checked);
      u = checked;
    }

    setAllAgreed(p && f && u);
  };

  const handleToggleDetail = (type: "privacy" | "financial" | "purchase") => {
    if (showDetailSection === type) {
      setShowDetailSection(null);
    } else {
      setShowDetailSection(type);
    }
  };

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

  // 코인 결제 실행 함수
  // 코인 결제 실행 함수
  const executePurchaseCoin = async (amount: number, coinName: string, name: string, phone: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      // 1. 포트원 결제창 띄우기 (심사 필수 요건)
      const paymentId = `c-${crypto.randomUUID()}`;

      // 0. Supabase DB orders 테이블에 PENDING 상태로 주문 정보 등록
      const { error: dbError } = await supabase
        .from("orders")
        .insert({
          payment_id: paymentId,
          user_id: user?.id,
          product_name: `코인 충전: ${coinName}`,
          amount: amount,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: user?.email || "",
          status: "PENDING",
        });

      if (dbError) {
        console.error("Order creation failed in DB:", dbError);
        alert("주문 대기 정보 등록에 실패했습니다: " + dbError.message);
        return;
      }

      const storeId = "store-8054c58a-c4b5-41b0-bb69-3c1aaf372ea4";
      let channelKey = "channel-key-ab754414-21c1-46c7-bb4f-f6d9a8833415";
      let payMethod: any = "CARD";

      const paymentParams: any = {
        storeId,
        paymentId: paymentId,
        channelKey,
        orderName: `코인 충전: ${coinName}`,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        redirectUrl: `${window.location.origin}/payments/redirect?type=coin&paymentId=${paymentId}`,
        noticeUrls: window.location.hostname === "localhost" ? undefined : [
          `${window.location.origin}/api/webhook/portone`
        ],
        customer: {
          email: user?.email || undefined,
          fullName: name.trim(),
          phoneNumber: phone.replace(/[^0-9]/g, ""),
        },
        customData: {
          userId: user?.id,
        },
      };

      if (paymentMethod === "KAKAOPAY") {
        paymentParams.channelKey = "channel-key-f96fa1b0-0b1b-49c3-9692-5700591ccc8b";
        paymentParams.payMethod = "EASY_PAY";
        paymentParams.easyPay = { easyPayProvider: "KAKAOPAY" };
      } else if (paymentMethod === "PHONE") {
        paymentParams.channelKey = "channel-key-ab754414-21c1-46c7-bb4f-f6d9a8833415";
        paymentParams.payMethod = "MOBILE";
        paymentParams.productType = "DIGITAL";
      } else {
        paymentParams.payMethod = "CARD";
      }

      const response = await requestPayment(paymentParams);

      // 2. 결제창에서 취소하거나 실패했을 경우
      if (!response || response.code != null) {
        await supabase
          .from("orders")
          .update({ status: "FAILED" })
          .eq("payment_id", paymentId);
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
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || e?.toString() || "알 수 없는 에러";
      alert(`결제 처리 중 에러가 발생했습니다.\n에러 상세: ${errMsg}`);
    }
  };

  // 코인 결제 시도 버튼 클릭시
  const handlePurchaseCoin = async (amount: number, coinName: string) => {
    const token = await getAccessToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    setPendingPurchase({ type: "coin", amount, coinName });
    setAllAgreed(false);
    setPrivacyAgreed(false);
    setFinancialAgreed(false);
    setPurchaseAgreed(false);
    setShowDetailSection(null);
    setShowBuyerModal(true);
  };

  // 정보 입력 모달 승인 핸들러
  const handleConfirmPayment = async () => {
    if (!buyerName.trim()) {
      alert("구매자 이름을 입력해 주세요.");
      return;
    }
    const rawPhone = buyerPhone.replace(/[^0-9]/g, "");
    if (rawPhone.length < 10) {
      alert("올바른 휴대폰 번호를 입력해 주세요.");
      return;
    }

    setShowBuyerModal(false);

    if (!pendingPurchase) return;

    if (pendingPurchase.type === "coin") {
      await executePurchaseCoin(pendingPurchase.amount, pendingPurchase.coinName, buyerName, buyerPhone);
    }

    setPendingPurchase(null);
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

        /* 구매자 정보 입력 모달 스타일 */
        .buyer-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .buyer-modal-content {
          width: 100%;
          max-width: 380px;
          background: #16161e;
          border: 1px solid rgba(255, 215, 120, 0.2);
          border-radius: 20px;
          padding: 24px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .buyer-modal-content h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          color: #ffffff;
          text-align: center;
        }
        .buyer-modal-content p {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          line-height: 1.5;
        }
        .buyer-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .buyer-input-group label {
          font-size: 12.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
          text-align: left;
        }
        .buyer-input-group input {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 14px;
          outline: none;
        }
        .buyer-input-group input:focus {
          border-color: #ffd700;
        }
        .buyer-consent-group {
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 12px;
        }
        .buyer-consent-all-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #ffd700;
          cursor: pointer;
          font-weight: 800;
          user-select: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
          margin-bottom: 4px;
        }
        .buyer-consent-all-label input {
          width: 17px;
          height: 17px;
          accent-color: #ffd700;
          cursor: pointer;
        }
        .buyer-consent-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .buyer-consent-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-weight: 600;
          user-select: none;
        }
        .buyer-consent-label input {
          width: 15px;
          height: 15px;
          accent-color: #ffd700;
          cursor: pointer;
        }
        .consent-detail-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
        .consent-detail-btn:hover {
          color: #ffd700;
        }
        .consent-detail-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px;
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.75);
          max-height: 120px;
          overflow-y: auto;
          text-align: left;
        }
        .consent-detail-box strong {
          color: #ffffff;
          display: block;
          margin-bottom: 4px;
        }
        .consent-detail-box ul {
          margin: 0;
          padding-left: 14px;
        }
        .consent-detail-box li {
          margin-bottom: 4px;
        }
        .buyer-modal-btn.submit.disabled {
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.3) !important;
          cursor: not-allowed;
          font-weight: 700;
        }
        .pay-method-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 4px;
        }
        .pay-method-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #ffffff;
          padding: 10px 4px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .pay-method-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .pay-method-btn.active {
          background: rgba(255, 215, 120, 0.1);
          border-color: #ffd700;
          color: #ffd700;
        }
        .buyer-modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .buyer-modal-btn {
          flex: 1;
          height: 44px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .buyer-modal-btn.cancel {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
        }
        .buyer-modal-btn.submit {
          background: linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%);
          color: #2b1d00;
          font-weight: 900;
        }
      `}</style>

      <div className="store-container">
        {/* 헤더 */}
        <div className="store-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowLeftIcon />
          </button>
          <h1 className="store-title">무림북 상품 서비스</h1>
          <button className="restore-btn" onClick={handleRestore}>
            복구
          </button>
        </div>

        {/* 1. 코인 충전 그리드 */}
        <div>
          <h2 className="section-label">코인</h2>
          <div className="coin-grid">
            <button className="coin-card gold-shine-card" onClick={() => handlePurchaseCoin(1090, "100 + 600 코인")}>
              <div className="coin-amount-row">
                <span className="coin-yellow-icon">P</span>
                <span className="coin-text-main">100</span>
                <span className="coin-text-bonus">+ 600</span>
              </div>
              <p className="coin-price">₩1,090</p>
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
            <span>4. 멤버십 서비스를 이용하시는 기간동안 홈페이지 내 모든 콘텐츠를 무제한으로 청취하실 수 있습니다.</span>
            <span>5. 멤버십은 현재 구독 기간이 종료되기 24시간 전에 자동으로 갱신되며, 결제 계정을 통해 결제가 진행됩니다.</span>
            <span>6. 자동 갱신을 원하지 않으실 경우, 구독 기간 종료 최소 24시간 전에 설정에서 해지해 주세요.</span>
            <span>7. 충전 또는 결제 후에도 잔액이 변하지 않을 경우, [복구] 버튼을 클릭해 새로 고침해 주세요.</span>
            <span>8. 기타 문의 사항은 [내정보] &gt; [고객문의(1:1 문의)]를 통해 문의해 주세요.</span>
            <span>9. 무림북의 멤버십 가입은 정식 멤버십 상품 서비스이므로 교환 및 환불이 불가능합니다. 소설을 즐겁게 이용해 주시면 감사하겠습니다.</span>
          </div>
        </div>

      </div>

      {/* 구매자 정보 수입 모달 */}
      {showBuyerModal && (
        <div className="buyer-modal-overlay">
          <div className="buyer-modal-content">
            <h3>구매자 정보 입력</h3>
            <p>안전한 결제 진행을 위해 구매 정보를 입력해 주세요.</p>
            
            <div className="buyer-input-group">
              <label>구매자 성함</label>
              <input 
                type="text" 
                placeholder="예: 홍길동" 
                value={buyerName} 
                onChange={(e) => setBuyerName(e.target.value)} 
              />
            </div>

            <div className="buyer-input-group">
              <label>구매자 휴대폰 번호</label>
              <input 
                type="tel" 
                placeholder="예: 010-1234-5678" 
                value={buyerPhone} 
                onChange={(e) => setBuyerPhone(e.target.value)} 
              />
            </div>

            <div className="buyer-input-group">
              <label>결제 수단</label>
              <div className="pay-method-selector">
                <button
                  type="button"
                  className={`pay-method-btn ${paymentMethod === "CARD" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("CARD")}
                >
                  💳 신용카드
                </button>
                <button
                  type="button"
                  className={`pay-method-btn ${paymentMethod === "KAKAOPAY" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("KAKAOPAY")}
                >
                  🟡 카카오페이
                </button>
                <button
                  type="button"
                  className={`pay-method-btn ${paymentMethod === "PHONE" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("PHONE")}
                >
                  📱 휴대폰결제
                </button>
              </div>
            </div>

            <div className="buyer-consent-group">
              <label className="buyer-consent-all-label">
                <input 
                  type="checkbox" 
                  checked={allAgreed} 
                  onChange={handleAgreeAllChange} 
                />
                <span>아래 결제 약관에 모두 동의합니다. (전체동의)</span>
              </label>

              <div className="buyer-consent-item-row">
                <label className="buyer-consent-label">
                  <input 
                    type="checkbox" 
                    checked={privacyAgreed} 
                    onChange={(e) => handleIndividualAgree("privacy", e.target.checked)} 
                  />
                  <span>[필수] 개인정보 수집 및 이용 동의</span>
                </label>
                <button 
                  type="button" 
                  className="consent-detail-btn"
                  onClick={() => handleToggleDetail("privacy")}
                >
                  {showDetailSection === "privacy" ? "닫기 ▲" : "보기 ▼"}
                </button>
              </div>

              <div className="buyer-consent-item-row">
                <label className="buyer-consent-label">
                  <input 
                    type="checkbox" 
                    checked={financialAgreed} 
                    onChange={(e) => handleIndividualAgree("financial", e.target.checked)} 
                  />
                  <span>[필수] 전자금융거래 이용약관 동의</span>
                </label>
                <button 
                  type="button" 
                  className="consent-detail-btn"
                  onClick={() => handleToggleDetail("financial")}
                >
                  {showDetailSection === "financial" ? "닫기 ▲" : "보기 ▼"}
                </button>
              </div>

              <div className="buyer-consent-item-row">
                <label className="buyer-consent-label">
                  <input 
                    type="checkbox" 
                    checked={purchaseAgreed} 
                    onChange={(e) => handleIndividualAgree("purchase", e.target.checked)} 
                  />
                  <span>[필수] 구매 조건 확인 및 결제 진행 동의</span>
                </label>
                <button 
                  type="button" 
                  className="consent-detail-btn"
                  onClick={() => handleToggleDetail("purchase")}
                >
                  {showDetailSection === "purchase" ? "닫기 ▲" : "보기 ▼"}
                </button>
              </div>

              {showDetailSection && (
                <div className="consent-detail-box">
                  {showDetailSection === "privacy" && (
                    <>
                      <strong>개인정보 수집 및 이용 안내 (필수)</strong>
                      <ul>
                        <li><strong>수집 및 이용 목적:</strong> 상품 구매 및 결제 처리, 회원 식별 및 서비스 제공, 고객 문의 응대</li>
                        <li><strong>수집 항목:</strong> 구매자 성함, 구매자 휴대폰 번호, 이메일 주소</li>
                        <li><strong>보유 및 이용 기간:</strong> 회원 탈퇴 시까지 또는 서비스 종료 시까지 (단, 전자상거래법 등 관계 법령에 규정이 있는 경우 해당 기간 동안 보관 후 파기)</li>
                        <li>※ 본 동의를 거부할 권리가 있으나, 거부 시 상품 구매 및 결제가 불가능합니다.</li>
                      </ul>
                    </>
                  )}
                  {showDetailSection === "financial" && (
                    <>
                      <strong>전자금융거래 이용약관 안내 (필수)</strong>
                      <ul>
                        <li><strong>이용 목적:</strong> 전자결제대행(PG) 서비스를 통한 안전한 결제 승인, 정산 처리 및 결제 도용 방지</li>
                        <li><strong>제공받는 자:</strong> 포트원, 결제 대행사(KG이니시스, 토스페이먼츠 등), 신용카드사, 카카오페이, 이동통신사</li>
                        <li><strong>제공 항목:</strong> 결제 금액, 주문 ID, 구매자 명, 휴대폰 번호, 카드사 정보 등 결제 승인에 필요한 데이터</li>
                        <li><strong>보유 및 이용 기간:</strong> 결제 처리 완료 및 서비스 제공 완료 시까지 (관계 법령에 따라 5년간 보관)</li>
                        <li>※ 본 동의는 전자금융거래법에 따른 필수 동의로, 거부 시 결제 진행이 불가능합니다.</li>
                      </ul>
                    </>
                  )}
                  {showDetailSection === "purchase" && (
                    <>
                      <strong>구매 조건 확인 및 결제 동의 (필수)</strong>
                      <ul>
                        <li><strong>구매 상품:</strong> {pendingPurchase?.type === "coin" ? `코인 충전: ${pendingPurchase.coinName}` : ""}</li>
                        <li><strong>결제 금액:</strong> {pendingPurchase?.type === "coin" ? `₩${pendingPurchase.amount.toLocaleString()}` : ""} (부가세 포함)</li>
                        <li><strong>이용 기간:</strong> 충전된 코인은 소진 시까지 이용 가능</li>
                        <li><strong>청약 철회 안내:</strong> 본 상품은 전자상거래법 제17조 제2항에 따른 '디지털 콘텐츠' 상품으로, 결제 즉시 코인이 지급되어 충전이 완료되므로 단순 변심에 의한 청약철회(환불)가 불가능합니다. 단, 서비스 자체의 하자로 인해 이용이 불가능하거나 충전된 코인을 전혀 사용하지 않은 채 법정 청약 철회 기간 내에 환불을 요청하시는 경우는 예외에 따릅니다.</li>
                        <li>※ 상품 가격, 사용 기간 및 환불 규정을 확인하였으며 결제 진행에 동의합니다.</li>
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="buyer-modal-buttons">
              <button className="buyer-modal-btn cancel" onClick={() => setShowBuyerModal(false)}>
                취소
              </button>
              <button 
                className={`buyer-modal-btn submit ${!(privacyAgreed && financialAgreed && purchaseAgreed) ? "disabled" : ""}`} 
                onClick={(privacyAgreed && financialAgreed && purchaseAgreed) ? handleConfirmPayment : undefined}
                disabled={!(privacyAgreed && financialAgreed && purchaseAgreed)}
              >
                확인 및 결제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}