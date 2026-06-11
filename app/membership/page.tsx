"use client";

import { requestPayment } from "@portone/browser-sdk/v2";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { works } from "@/app/data/works";
import { getEpisodesByWork } from "@/app/data/episodes";
import { supabase } from "@/lib/supabaseClient";

// 뒤로가기 아이콘
function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

// 라디오/체크 아이콘 (선택됨)
function CheckCircleFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#ff2a5f" />
      <polyline points="8 12 11 15 16 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 라디오/체크 아이콘 (선택 안됨)
function CheckCircleEmpty() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    </svg>
  );
}

// 재생 아이콘 (혜택)
function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}

// 다운로드 아이콘
function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// 번개 아이콘 (혜택)
function ThunderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

// 별빛/스파클 아이콘 (혜택)
function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
      <path d="M10 8.5 L11.2 10.7 L13.5 11 L11.8 12.6 L12.2 15 L10 13.8 L7.8 15 L8.2 12.6 L6.5 11 L8.8 10.7 Z" fill="currentColor" />
    </svg>
  );
}

// 시계 아이콘 (공개 예정 알림받기)
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

// 체크 아이콘 (알림 설정 완료)
function CheckIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

type DramaItem = {
  id: string;
  title: string;
  thumbnail: string;
  date?: string;
};

export default function MembershipPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "annual">("weekly");
  const [alarmSettings, setAlarmSettings] = useState<Record<string, boolean>>({});
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  useEffect(() => {
    try {
      const plan = localStorage.getItem("membership");
      if (plan) setSubscribedPlan(plan);
    } catch (e) { }
  }, []);

  // 멤버십 전용 소설 데이터 가공
  const exclusiveNovels = works.filter(
    (w) => w.id === "cheonmujin" || w.id === "hwansaeng-geomjon"
  );

  const getPlayHref = (workId: string) => {
    const episodes = getEpisodesByWork(workId);
    const firstEp = episodes[0];
    return firstEp
      ? `/episode/${workId}/${firstEp.id}?part=1&autoplay=1`
      : `/work/${workId}`;
  };

  // 알림설정 상태 동기화
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alarmSettings");
      if (saved) {
        setAlarmSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 알림 받기 토글
  const handleRequestNotification = async (workId: string) => {
    const isSet = alarmSettings[workId];
    if (isSet) {
      const updated = { ...alarmSettings, [workId]: false };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 해제되었습니다.");
      return;
    }

    if (!("Notification" in window)) {
      const updated = { ...alarmSettings, [workId]: true };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 완료되었습니다! (알림을 지원하지 않는 브라우저이므로 설정만 완료되었습니다)");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...alarmSettings, [workId]: true };
        setAlarmSettings(updated);
        localStorage.setItem("alarmSettings", JSON.stringify(updated));
        alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
      } else {
        alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
      }
    } catch (error) {
      Notification.requestPermission((permission) => {
        if (permission === "granted") {
          const updated = { ...alarmSettings, [workId]: true };
          setAlarmSettings(updated);
          localStorage.setItem("alarmSettings", JSON.stringify(updated));
          alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
        } else {
          alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
        }
      });
    }
  };

  const handleSubscribe = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      setShowBuyerModal(true);
    } catch (e: any) {
      console.error(e);
      alert("구독 시도 중 에러가 발생했습니다.");
    }
  };

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

    try {
      const proceed = confirm(
        "🍵 [멤버십 서비스 가입 동의 및 안내]\n\n\"소중한 상품 가입에 감사드립니다! 본 상품은 디지털 콘텐츠 정기 멤버십 서비스 상품으로, 결제 완료와 동시에 혜택이 즉시 개시(감상 권한 활성화)되어 이후 취소 및 환불이 불가능하오니 신중한 결정 부탁드립니다.\"\n\n동의하고 가입을 진행하시겠습니까?"
      );
      if (!proceed) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 선택된 플랜에 따른 가격 및 이름 설정
      const price = selectedPlan === "weekly" ? 3000 : 99900;
      const planName = selectedPlan === "weekly" ? "주간 멤버십 서비스" : "연간 멤버십 서비스";
      const paymentId = `membership-${crypto.randomUUID()}`;

      // 0. Supabase DB orders 테이블에 PENDING 상태로 주문 정보 등록
      const { error: dbError } = await supabase
        .from("orders")
        .insert({
          payment_id: paymentId,
          user_id: session.user.id,
          product_name: planName,
          amount: price,
          customer_name: buyerName.trim(),
          customer_phone: buyerPhone.trim(),
          customer_email: session.user.email || "",
          status: "PENDING",
        });

      if (dbError) {
        console.error("Order creation failed in DB:", dbError);
        alert("주문 대기 정보 등록에 실패했습니다: " + dbError.message);
        return;
      }

      // 1. 포트원 결제창 호출 (심사 필수)
      const response = await requestPayment({
        storeId: "store-8054c58a-c4b5-41b0-bb69-3c1aaf372ea4", // ⚠️ 반드시 포트원 테스트 상점 ID로 교체하세요
        paymentId: paymentId,
        channelKey: "channel-key-10ae1c88-a130-4f80-82b3-dd268f9b4ae4",
        orderName: `멤버십 상품 구독: ${planName}`,
        totalAmount: price,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        noticeUrls: [
          `${window.location.origin}/api/webhook/portone`
        ],
        customer: {
          email: session.user.email || undefined,
          name: buyerName.trim(),
          phoneNumber: buyerPhone.trim(),
        },
      });

      if (!response || response.code != null) {
        // Update order status to FAILED in case of cancel/failure
        await supabase
          .from("orders")
          .update({ status: "FAILED" })
          .eq("payment_id", paymentId);
        alert(`결제가 취소되었거나 실패했습니다: ${response?.message ?? "응답 없음"}`);
        return;
      }

      // 2. 결제 성공 후 멤버십 활성화 API 호출
      const res = await fetch("/api/me/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: selectedPlan, paymentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "구독 처리 실패");

      localStorage.setItem("membership", selectedPlan);
      alert(`${planName} 가입이 완료되었습니다!`);
      router.push("/");
    } catch (e: any) {
      console.error(e);
      alert("구독 처리 중 오류가 발생했습니다: " + e.message);
    }
  };

  const handleRestore = async () => {
    alert("구매 내역 복구를 요청했습니다. 이전 구독 내역을 확인합니다.");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/me/restore", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("membership", data.plan);
        alert(data.message);
        window.location.reload();
      } else {
        alert(data.message || "구독 내역이 없습니다.");
      }
    } catch (e: any) {
      console.error(e);
      alert("복구 중 오류가 발생했습니다.");
    }
  };



  // 공개 예정 소설 데이터
  const comingSoonDramas: DramaItem[] = [];

  return (
    <main className="membership-main">
      <style>{`
        .membership-main {
          height: 100dvh;
          background: linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.96)), url("/background.jpg") center / cover no-repeat fixed;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          position: relative;
        }

        /* 스크롤 가능한 본문 영역 */
        .membership-scroll-content {
          flex: 1;
          width: 100%;
          max-width: 480px;
          overflow-y: auto;
          padding: 20px 16px 160px; /* 고정 버튼을 고려한 하단 패딩 */
          display: flex;
          flex-direction: column;
          gap: 28px;
          scrollbar-width: none; /* 파이어폭스 스크롤바 숨김 */
        }

        .membership-scroll-content::-webkit-scrollbar {
          display: none; /* 크롬/사파리 스크롤바 숨김 */
        }

        /* 헤더 */
        .membership-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 44px;
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

        .restore-btn {
          background: none;
          border: none;
          color: #8c8c96;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        /* 서포트 타이틀 */
        .support-info {
          text-align: center;
          margin-top: 4px;
        }

        .support-title {
          font-size: 20px;
          font-weight: 850;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .support-subtitle {
          font-size: 13px;
          color: #8c8c96;
          margin: 0;
          font-weight: 500;
        }

        /* 플랜 목록 */
        .plans-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .plan-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 16px;
          border-radius: 14px;
          cursor: pointer;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .plan-card.selected {
          background: rgba(255, 42, 95, 0.08);
          border: 2px solid #ff2a5f;
        }

        .plan-card.unselected {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .plan-info-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .plan-title {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .plan-price {
          font-size: 17px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
        }

        .plan-badge {
          position: absolute;
          top: -10px;
          right: 12px;
          background: #535cff;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: -0.3px;
          box-shadow: 0 2px 6px rgba(83, 92, 255, 0.4);
        }

        .plan-duration-tag {
          align-self: flex-end;
          font-size: 12px;
          color: #8c8c96;
          font-weight: 700;
          margin-top: -6px;
        }

        /* 혜택 섹션 */
        .benefits-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255,255,255,0.04);
          padding: 20px 16px;
          border-radius: 16px;
        }

        .benefits-title {
          font-size: 16px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
        }

        .benefit-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ffffff;
        }

        .benefit-icon-wrapper {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffe9a3;
          flex-shrink: 0;
        }

        .benefit-text {
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.88);
        }

        /* 1. 멤버십 전용 드라마 섹션 */
        .exclusive-section-title {
          font-size: 18px;
          font-weight: 850;
          color: #ffffff;
          margin: 0 0 16px 0;
          letter-spacing: -0.4px;
        }

        .exclusive-placeholder {
          width: 100%;
          height: 120px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .exclusive-placeholder-text {
          font-size: 14px;
          color: #8c8c96;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        /* 2. 공개 예정 섹션 */
        .coming-soon-section-title {
          font-size: 18px;
          font-weight: 850;
          color: #ffffff;
          margin: 0 0 16px 0;
          letter-spacing: -0.4px;
        }

        .coming-soon-timeline {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
          padding-left: 2px;
        }

        .timeline-node {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .timeline-bullet {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff2a5f;
          box-shadow: 0 0 6px #ff2a5f;
        }

        .timeline-date {
          font-size: 12px;
          font-weight: 800;
          color: #ff2a5f;
        }

        .timeline-date-inactive {
          font-size: 12px;
          font-weight: 700;
          color: #8c8c96;
        }

        .timeline-bullet-inactive {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8c8c96;
        }

        .timeline-connector {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.15);
        }

        /* 가로 스크롤 카드 */
        .coming-soon-scroll-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
        }

        .coming-soon-scroll-row::-webkit-scrollbar {
          display: none;
        }

        .coming-soon-card-container {
          flex-shrink: 0;
          width: 110px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .coming-soon-thumb-wrap {
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
          position: relative;
        }

        .coming-soon-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .coming-soon-badge {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coming-soon-badge-text {
          background: rgba(255, 215, 120, 0.15);
          color: #ffe9a3;
          border: 1px solid rgba(255, 215, 120, 0.4);
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 800;
        }

        .coming-soon-title {
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .coming-soon-alarm-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          height: 28px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .coming-soon-alarm-btn.active {
          background: rgba(0, 200, 83, 0.15);
          border-color: rgba(0, 200, 83, 0.3);
          color: #00c853;
        }

        /* 3. 충전 안내 섹션 */
        .info-section {
          background: rgba(0, 0, 0, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 24px 0 10px 0;
        }

        .info-title {
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 12px 0;
        }

        .info-link {
          font-size: 13px;
          font-weight: 700;
          color: #8c8c96;
          text-decoration: underline;
          cursor: pointer;
          display: inline-block;
          margin-bottom: 16px;
        }

        .info-paragraph {
          font-size: 12.5px;
          line-height: 1.6;
          color: #8c8c96;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* 하단 고정 결제 영역 */
        .subscribe-fixed-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.92) 20%, #000000 100%);
          padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 100;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .subscribe-btn {
          width: 100%;
          max-width: 440px;
          background: #ff2a5f;
          color: #ffffff;
          font-size: 16px;
          font-weight: 850;
          height: 52px;
          border-radius: 26px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 15px rgba(255, 42, 95, 0.4);
        }

        .subscribe-btn:active {
          transform: scale(0.98);
          opacity: 0.95;
        }

        .subscribe-caption {
          font-size: 11px;
          color: #8c8c96;
          font-weight: 500;
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

        .exclusive-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 800;
          z-index: 2;
        }
      `}</style>

      {/* 스크롤 가능한 본문 영역 */}
      <div className="membership-scroll-content">
        {/* 헤더 */}
        <div className="membership-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ChevronLeft />
          </button>
          <button className="restore-btn" onClick={handleRestore}>
            복구
          </button>
        </div>

        {/* 타이틀 */}
        <div className="support-info">
          <h1 className="support-title">&lt;무림북 멤버십 서비스 가입&gt;</h1>
          <p className="support-subtitle">멤버십 상품 가입으로 무제한 감상 서비스를 만나보세요.</p>
        </div>

        {/* 플랜 카드 */}
        <div className="plans-list">
          {/* 주간 멤버십 */}
          <div
            className={`plan-card ${selectedPlan === "weekly" ? "selected" : "unselected"}`}
            onClick={() => setSelectedPlan("weekly")}
          >
            {selectedPlan === "weekly" ? <CheckCircleFilled /> : <CheckCircleEmpty />}
            <div className="plan-info-right">
              <h3 className="plan-title">주간 무제한 이용권</h3>
              <p className="plan-price">₩ 3000/주</p>
              <span className="plan-duration-tag">주간 멤버십 서비스</span>
            </div>
          </div>

          {/* 연간 멤버십 */}
          <div
            className={`plan-card ${selectedPlan === "annual" ? "selected" : "unselected"}`}
            onClick={() => setSelectedPlan("annual")}
          >
            <div className="plan-badge">기간 한정 할인</div>
            {selectedPlan === "annual" ? <CheckCircleFilled /> : <CheckCircleEmpty />}
            <div className="plan-info-right">
              <h3 className="plan-title">연간 무제한 이용권</h3>
              <p className="plan-price">₩ 99900/년</p>
              <span className="plan-duration-tag">연간 멤버십 서비스</span>
            </div>
          </div>
        </div>

        {/* 혜택 목록 */}
        <div className="benefits-section">
          <h2 className="benefits-title">왜 멤버십 상품에 가입해야 할까요?</h2>
          <div className="benefit-list">
            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <PlayIcon />
              </div>
              <span className="benefit-text">매주 새롭게 업데이트 완결작품 무료 청취</span>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <DownloadIcon />
              </div>
              <span className="benefit-text">
                무제한 오프라인 다운로드
              </span>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <ThunderIcon />
              </div>
              <span className="benefit-text">작가의 글쓰는 창작, 동력, 급상승!!!</span>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <SparklesIcon />
              </div>
              <span className="benefit-text">멤버십 전용 콘텐츠</span>
            </div>
          </div>
        </div>

        {/* 1. 멤버십 전용 소설 섹션 */}
        <div className="exclusive-section">
          <h2 className="exclusive-section-title">멤버십 전용 소설</h2>
          <div className="coming-soon-scroll-row">
            {exclusiveNovels.map((novel) => {
              const playHref = getPlayHref(novel.id);
              return (
                <div
                  key={novel.id}
                  className="coming-soon-card-container"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(playHref)}
                >
                  <div className="coming-soon-thumb-wrap">
                    <img src={novel.thumbnail} alt={novel.title} className="coming-soon-thumb" loading="lazy" />
                    {novel.badge && (
                      <div
                        className="exclusive-badge"
                        style={{
                          background: novel.badge === "인기" ? "#ff2a5f" : "#535cff",
                          color: "#ffffff"
                        }}
                      >
                        {novel.badge}
                      </div>
                    )}
                  </div>
                  <h3 className="coming-soon-title">{novel.title}</h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 공개 예정 섹션 */}
        <div className="coming-soon-section">
          <h2 className="coming-soon-section-title">공개 예정</h2>

          {/* 타임라인 헤더 */}
          <div className="coming-soon-timeline">
            <div className="timeline-node">
              <div className="timeline-bullet" />
              <span className="timeline-date">06. 03.</span>
            </div>
          </div>

          {/* 가로 스크롤 영역 */}
          <div className="coming-soon-scroll-row">
            {comingSoonDramas.length > 0 ? (
              comingSoonDramas.map((drama) => (
                <div key={drama.id} className="coming-soon-card-container">
                  <div className="coming-soon-thumb-wrap">
                    <img src={drama.thumbnail} alt={drama.title} className="coming-soon-thumb" loading="lazy" />
                    <div className="coming-soon-badge">
                      <span className="coming-soon-badge-text">준비중</span>
                    </div>
                  </div>
                  <h3 className="coming-soon-title">{drama.title}</h3>
                  <button
                    className={`coming-soon-alarm-btn ${alarmSettings[drama.id] ? "active" : ""}`}
                    onClick={() => handleRequestNotification(drama.id)}
                  >
                    {alarmSettings[drama.id] ? (
                      <>
                        <CheckIconSmall />
                        <span>설정 완료</span>
                      </>
                    ) : (
                      <>
                        <ClockIcon />
                        <span>알림 받기</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: "20px 10px", color: "rgba(255, 255, 255, 0.4)", fontSize: "14px" }}>
                새로운 작품을 준비 중입니다.
              </div>
            )}
          </div>
        </div>

        {/* 3. 충전 안내 섹션 */}
        <div className="info-section">
          <h2 className="info-title">충전 안내</h2>
          <span className="info-link" onClick={() => alert("서비스 이용약관으로 이동합니다.")}>
            서비스 이용약관 및 개인정보 처리방침
          </span>
          <div className="info-paragraph">
            <span>1. 무림북에는 무료 및 유료 콘텐츠가 포함되어 있습니다.</span>
            <span>2. 유료 콘텐츠는 포인트를 사용해 잠금 해제하거나, 멤버십 구독을 통해 시청할 수 있습니다. 단, 멤버십 전용 콘텐츠는 멤버십 구독으로만 시청가능합니다.</span>
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

      {/* 하단 고정 결제 영역 */}
      <div className="subscribe-fixed-bar">
        <button
          className="subscribe-btn"
          style={{ opacity: subscribedPlan ? 0.7 : 1 }}
          onClick={subscribedPlan ? undefined : handleSubscribe}
        >
          {subscribedPlan === "weekly"
            ? "주간 무제한 이용권 사용중💖"
            : subscribedPlan === "annual" || subscribedPlan === "yearly"
              ? "연간 무제한 이용권 사용중💖"
              : "지금 가입하기"}
        </button>
        <span className="subscribe-caption">
          {subscribedPlan ? "언제든지 설정에서 해지 가능" : "자동 갱신 · 언제든지 해지 가능"}
        </span>
      </div>

      {/* 구매자 정보 수집 모달 */}
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

            <div className="buyer-modal-buttons">
              <button className="buyer-modal-btn cancel" onClick={() => setShowBuyerModal(false)}>
                취소
              </button>
              <button className="buyer-modal-btn submit" onClick={handleConfirmPayment}>
                확인 및 결제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
