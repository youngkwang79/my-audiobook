"use client";
 
import { useRouter } from "next/navigation";
import Link from "next/link";
 
function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}
 
export default function RefundPage() {
  const router = useRouter();
 
  return (
    <main className="terms-main-bg">
      <style>{`
        .terms-main-bg {
          min-height: 100dvh;
          background: #0d0c10;
          color: #e2e2e9;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
          padding: 24px 16px calc(60px + env(safe-area-inset-bottom));
          box-sizing: border-box;
        }
 
        .terms-container {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
 
        /* 상단 네비게이션 탑바 */
        .terms-header {
          display: flex;
          align-items: center;
          height: 44px;
          position: relative;
        }
 
        .terms-back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 8px 8px 8px 0;
        }
 
        .terms-header-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 auto;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }
 
        /* 탭 가이드 메뉴 */
        .terms-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 8px;
        }
 
        .terms-tab {
          flex: 1;
          text-align: center;
          padding: 12px 0;
          font-size: 13.5px;
          font-weight: 700;
          color: #8c8c96;
          text-decoration: none;
          border-bottom: 2px solid transparent;
        }
 
        .terms-tab.active {
          color: #f7d070;
          border-bottom: 2px solid #f7d070;
        }
 
        /* 약관 본문 스타일 */
        .terms-content {
          line-height: 1.65;
          font-size: 14px;
          color: #b8b8c0;
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 8px 4px;
        }
 
        .terms-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
 
        .terms-section-title {
          font-size: 15px;
          font-weight: 850;
          color: #ffffff;
          margin: 0;
        }
 
        .terms-bullet-list {
          list-style: none;
          padding-left: 0;
          margin: 4px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
 
        .terms-bullet-list li {
          position: relative;
          padding-left: 14px;
        }
 
        .terms-bullet-list li::before {
          content: "•";
          position: absolute;
          left: 4px;
          color: #fca834;
        }
 
        .terms-alert-box {
          background: rgba(252, 168, 52, 0.06);
          border: 1px solid rgba(252, 168, 52, 0.15);
          border-radius: 10px;
          padding: 12px 14px;
          color: #e6d3a3;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.5;
        }
 
        .terms-footer {
          margin-top: 24px;
          font-size: 12.5px;
          color: #55555d;
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
       `}</style>
 
      <div className="terms-container">
        {/* 탑바 */}
        <div className="terms-header">
          <button className="terms-back-btn" onClick={() => router.back()} title="뒤로가기">
            <BackIcon />
          </button>
          <span className="terms-header-title">환불 및 결제 정책</span>
        </div>
 
        {/* 탭 네비게이션 */}
        <div className="terms-tabs">
          <Link href="/terms" className="terms-tab">이용약관</Link>
          <Link href="/privacy" className="terms-tab">개인정보 처리</Link>
          <Link href="/refund" className="terms-tab active">환불 및 결제</Link>
        </div>
 
        {/* 약관 본문 */}
        <div className="terms-content">
          <div className="terms-alert-box">
            💳 무림북은 디지털 콘텐츠 이용과 결제에 투명하고 공정한 결제 정책을 운영합니다. 전자상거래법 및 관계 법령을 준수하면서 플랫폼 남용을 막기 위한 정책을 적용하고 있으니 결제 전 내용을 반드시 숙지해 주시기 바랍니다.
          </div>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제1조 (결제 및 코인 충전)</h2>
            <ul className="terms-bullet-list">
              <li>이용자는 신용카드, 계좌이체, 간편결제 등 회사가 제공하는 결제 수단을 통해 대금을 결제하고 리워드로 '코인(포인트)'을 지급받거나 '정기 멤버십 서비스'를 구독 및 개시할 수 있습니다.</li>
              <li>결제 과정에서 발생하는 한도, 수수료, 한화 환산율 등은 이용자가 사용하는 결제사(카드사, 은행 등) 및 결제 대행사(PG사)의 기준을 따릅니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제2조 (청약철회 및 환불 대상 요건)</h2>
            <p>
              대한민국 전자상거래 등에서의 소비자보호에 관한 법률(이하 전자상거래법) 제17조에 의거하여 아래의 요건을 모두 충족하는 경우에 한하여 <strong>구매일로부터 7일 이내</strong>에 청약철회(환불) 신청이 가능합니다.
            </p>
            <ul className="terms-bullet-list">
              <li><strong>미사용 상태의 코인</strong>: 결제 후 지급받은 리워드 코인을 단 1포인트도 사용하지 않고 그대로 계정에 보유하고 있는 경우에만 청약철회가 인정됩니다.</li>
              <li><strong>결제 후 7일 이내</strong>: 결제가 승인된 날로부터 영업일 기준이 아닌 달력 기준 7일(168시간) 이내에 환불을 요청하셔야 합니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제3조 (환불 대행 수수료 공제 규정)</h2>
            <ul className="terms-bullet-list">
              <li>제2조의 청약철회 요건을 충족하여 환불 절차가 진행될 시, 결제 대행사(PG사) 승인 취소 수수료, 은행 송금 수수료 및 운영 행정 수수료 명목으로 <strong>결제 금액의 10% (단, 수수료가 1,000원 미만인 경우 최소 수수료 1,000원 적용)를 공제</strong>한 나머지 잔액을 반환합니다.</li>
              <li>공제 후 남은 잔액이 최소 수수료(1,000원) 이하인 경우에는 환불 처리가 불가능합니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제4조 (청약철회 및 환불이 전면 제한되는 기준)</h2>
            <p>디지털 콘텐츠 서비스의 특성상 다음 각 호에 해당하는 경우, 전자상거래법 제17조 제2항 및 관련 법령에 의거하여 청약철회 및 환불이 절대 불가능합니다.</p>
            <ul className="terms-bullet-list">
              <li><strong>코인을 일부라도 사용한 경우</strong>: 충전된 리워드 코인 중 일부라도 사용하여 유료 회차를 잠금 해제하거나 청취한 경우, 디지털 콘텐츠 제공이 이미 완전히 개시된 것으로 간주하여 청약철회가 전면 불가합니다.</li>
              <li><strong>정액 멤버십 서비스</strong>: 멤버십 가입 즉시 멤버십 전용 음원 청취 혜택 및 무제한 스트리밍 서비스 권한이 활성화되므로 결제 완료 이후에는 취소 및 중도 환불이 불가능합니다.</li>
              <li><strong>무료 및 이벤트 코인</strong>: 출석체크 미션, 일일 문안인사, 친구 초대 등을 통해 무상으로 적립받은 코인은 환불 대상이 아니며, 현금으로 환산 또는 반환되지 않고 회원 탈퇴 시 즉시 소멸합니다.</li>
              <li><strong>약관 위반 계정</strong>: 불법 음원 녹음, 무단 복제 및 배포, AI 학습용 웹 크롤링 및 수집 등 무림북 이용약관을 중대하게 위반하여 서비스 이용이 영구 제한되거나 계정이 징계 정지된 경우, 해당 계정의 충전 잔액은 반환되지 않습니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제5조 (환불 신청 및 처리 절차)</h2>
            <ul className="terms-bullet-list">
              <li>환불 신청은 무림북 공식 이메일(sun_writer@murimbook.com) 또는 1:1 고객문의(카카오톡 오픈채팅)를 통해 접수할 수 있습니다.</li>
              <li>이용자는 환불 신청 시 아래 정보를 성실하게 제공해야 합니다.
                <br />1. 가입한 이메일 계정 및 회원 ID (마이페이지에서 확인 가능)
                <br />2. 결제 일시 및 결제 수단
                <br />3. 결제 금액 및 결제 영수증 이미지/캡처본
                <br />4. 환불 사유 및 계정 내 미사용 코인 잔액 화면 캡처
              </li>
              <li>회사는 환불 신청 정보를 검토한 뒤, 환불 대상 요건에 부합할 경우 업무일 기준 3~5일 이내에 수수료 10%를 공제하고 결제 취소 또는 계좌 송금 방식으로 환불 처리를 완료합니다.</li>
            </ul>
          </section>
 
          <div className="terms-footer">
            <span>제공 주체: 무림북 (Murimbook)</span>
            <span>공식 문의: sun_writer@murimbook.com / 1:1 고객문의</span>
            <span>개정 및 시행일: 2026-06-05</span>
          </div>
        </div>
      </div>
    </main>
  );
}