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
 
export default function TermsPage() {
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
          <span className="terms-header-title">서비스 약관</span>
        </div>
 
        {/* 탭 네비게이션 */}
        <div className="terms-tabs">
          <Link href="/terms" className="terms-tab active">이용약관</Link>
          <Link href="/privacy" className="terms-tab">개인정보 처리</Link>
          <Link href="/refund" className="terms-tab">환불 및 결제</Link>
        </div>
 
        {/* 약관 본문 */}
        <div className="terms-content">
          <div className="terms-alert-box">
            📢 무림북은 디지털 콘텐츠 구독 서비스를 기반으로 하며, 결제 시 리워드 코인 지급과 동시에 서비스 이용 권한이 즉시 개시되는 디지털 콘텐츠 사이트입니다. 결제 전 약관을 신중하게 확인해 주시기 바랍니다.
          </div>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제1조 (목적)</h2>
            <p>
              본 약관은 "무림북"(이하 "회사"라 함)이 제공하는 무협 오디오북 및 관련 디지털 콘텐츠 서비스(이하 "서비스"라 함)의 이용과 관련하여, 회사와 회원(이하 "이용자"라 함) 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제2조 (용어의 정의)</h2>
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="terms-bullet-list">
              <li><strong>무림북 서비스</strong>: 회사가 모바일 및 웹을 통해 제공하는 오디오 음원 청취, 텍스트 감상, 커뮤니티 등의 플랫폼 서비스 전체를 의미합니다.</li>
              <li><strong>회원(이하 이용자)</strong>: 본 약관에 동의하고 서비스 가입을 완료하여 서비스를 이용하는 고객을 의미합니다.</li>
              <li><strong>포인트 및 리워드 코인</strong>: 서비스 내 유료 회차 잠금 해제 및 부가 서비스 이용을 위해 사용되는 디지털 재화를 의미합니다.</li>
              <li><strong>멤버십/이용권 결제</strong>: 서비스 내의 디지털 콘텐츠 이용 권한 및 멤버십 혜택을 획득하기 위해 대금을 결제하는 행위를 의미합니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제3조 (멤버십/이용권 결제 및 서비스 성격)</h2>
            <ul className="terms-bullet-list">
              <li>이용자가 서비스 내에서 수행하는 결제(코인 충전 및 정기 멤버십 서비스 결제)는 기본적으로 유료 콘텐츠 감상 권한 및 정액제 멤버십 혜택을 구매하는 유료 상거래 계약의 성격을 지닙니다.</li>
              <li>회사는 결제를 완료하신 이용자분들에 대한 혜택 제공의 일환으로, 유료 콘텐츠 감상에 사용할 수 있는 <strong>'리워드 코인(포인트)'</strong> 및 <strong>'정액 멤버십 이용 권한'</strong>을 즉시 부여합니다.</li>
              <li>디지털 재화 및 멤버십 혜택이 이용자 계정에 반영(지급)된 시점에 서비스 제공이 완전히 개시된 것으로 간주하며, 대한민국 전자상거래법 등 관계 법령이 제한하는 바에 따라 결제 이후 취소 및 환불이 엄격하게 방어됩니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제4조 (회원 가입 및 계정 관리)</h2>
            <ul className="terms-bullet-list">
              <li>이용자는 본인의 이메일 정보 또는 소셜 간편 가입을 통해 본인 인증을 거쳐 가입할 수 있으며, 타인의 명의를 도용하여 가입하는 행위는 전면 금지됩니다.</li>
              <li>이용자는 본인의 계정 및 비밀번호, 인증 정보를 타인에게 양도하거나 대여할 수 없으며, 관리 소홀로 발생한 불이익에 대한 책임은 이용자 본인에게 있습니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제5조 (지적재산권 및 저작권 보호장치)</h2>
            <ul className="terms-bullet-list">
              <li>Ref: 서비스 내 제공되는 모든 오디오 음원, 이미지, 썸네일, 텍스트, 사용자 인터페이스 등 일체의 콘텐츠 저작권 및 지적재산권은 회사 및 원저작권자(작가)에게 독점적으로 귀속됩니다.</li>
              <li>이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 서면 승낙 없이 복제, 송신, 출판, 배포, 불법 녹음/녹화, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
              <li><strong>인공지능(AI) 학습 금지</strong>: 회사의 명시적인 서면 허가 없이, 본 서비스에 노출되거나 제공되는 음원, 텍스트 및 데이터를 웹 크롤링, 스크레이핑, 봇 등의 기술로 수집하거나, AI 모델의 기계 학습(Machine Learning / Deep Learning)용 데이터셋으로 수집, 가공, 학습시키는 모든 행위를 전면 금지합니다. 이를 위반 시 저작권법 및 부정경쟁방지법에 의거 민형사상 중대한 손해배상 책임과 형사처벌의 대상이 될 수 있습니다.</li>
              <li><strong>손해배상액의 예정 (위약벌)</strong>: 이용자가 서비스 내의 오디오 음원 및 자막 텍스트 데이터를 무단 녹음, 불법 복제, 외부 유포 및 배포하거나 AI 학습 데이터로 무단 수집/가공하는 등 본 저작권 규정을 위반하는 경우, 저작권 침해에 따른 실제 손해액의 입증 여부와 관계없이 위반한 저작물(음원 파일 및 회차) 1개당 일시금 3,000,000원(삼백만 원)을 손해배상액(위약금)으로 회사 및 원저작권자에게 즉시 배상하여야 합니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제6조 (서비스 이용제한 및 의무위반)</h2>
            <p>이용자가 다음 각 호의 의무를 위반할 경우, 회사는 사전 경고 없이 서비스 이용 제한, 계정 정지, 영구 탈퇴 및 법적 조치를 취할 수 있습니다.</p>
            <ul className="terms-bullet-list">
              <li>타인의 계정 정보 또는 결제 수단을 도용하는 행위</li>
              <li>불법 프로그램(매크로, 크롤러 등)을 이용해 비정상적으로 서비스를 호출하거나 부하를 유발하는 행위</li>
              <li>결제 대행사의 허점을 이용하거나 악의적인 충전 및 청약철회를 반복하여 플랫폼에 손해를 끼치는 행위</li>
              <li>무림북 오디오 음원을 비공식적인 경로로 재배포하거나 녹음하여 공유하는 행위</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제7조 (면책 조항)</h2>
            <ul className="terms-bullet-list">
              <li>회사는 천재지변, 정전, 통신 장애, 파트너(클라우드 R2, Supabase 등)의 불가항력적인 오류 또는 서비스 점검 등 불가피한 사정으로 서비스 제공이 일시 중단되는 경우 책임을 면합니다.</li>
              <li>콘텐츠 원작자(작가)의 건강, 개인 사정, 연재 계약상의 변동으로 인해 특정 소설의 연재 주기가 변동되거나 업로드가 지연되는 등의 사항에 대해서는 회사가 보증하지 않으며, 이로 인한 환불 사유가 되지 않습니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제8조 (준거법 및 분쟁의 해결)</h2>
            <ul className="terms-bullet-list">
              <li>본 약관의 해석 및 회사와 이용자 간의 분쟁에 대해서는 대한민국 법령을 준거법으로 적용합니다.</li>
              <li>서비스 이용과 관련하여 발생한 분쟁에 대해 소송이 제기될 경우, 대한민국 민사소송법에 따른 관할 법원 또는 회사의 본사 소재지 관할 법원을 제1심 합의관할 법원으로 합니다.</li>
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