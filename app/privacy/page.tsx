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
 
export default function PrivacyPage() {
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
          <span className="terms-header-title">개인정보 처리방침</span>
        </div>
 
        {/* 탭 네비게이션 */}
        <div className="terms-tabs">
          <Link href="/terms" className="terms-tab">이용약관</Link>
          <Link href="/privacy" className="terms-tab active">개인정보 처리</Link>
          <Link href="/refund" className="terms-tab">환불 및 결제</Link>
        </div>
 
        {/* 약관 본문 */}
        <div className="terms-content">
          <div className="terms-alert-box">
            🛡️ 무림북은 이용자의 개인정보를 소중하게 보호하며, 안전한 서비스 환경을 구축하기 위해 개인정보 보호법 및 관계 법령을 철저히 준수합니다.
          </div>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제1조 (개인정보의 처리 목적)</h2>
            <p>
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="terms-bullet-list">
              <li><strong>회원 가입 및 관리</strong>: 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정이용 방지, 각종 고지·통지, 고충처리 등을 목적으로 개인정보를 처리합니다.</li>
              <li><strong>서비스 제공 및 정산</strong>: 오디오북 재생, 텍스트 스토리 제공, 멤버십/이용권 결제 및 영수증 발행, 리워드 코인 지급, 포인트 충전 및 정산 등 서비스 제공 및 이에 따른 요금결제·정산을 목적으로 개인정보를 처리합니다.</li>
              <li><strong>고객 문의 처리</strong>: 1:1 상담 접수 및 답변, 불만 처리 등 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 등의 목적으로 개인정보를 처리합니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제2조 (처리하는 개인정보의 항목)</h2>
            <p>회사는 서비스 이용 과정에서 아래와 같은 개인정보 항목을 수집 및 처리할 수 있습니다.</p>
            <ul className="terms-bullet-list">
              <li><strong>필수 수집 항목</strong>: 이메일 주소, 로그인 식별자(SNS 간편 가입 ID), 비밀번호(자체 가입 시 암호화), 닉네임, 기기 고유식별자(UUID 또는 ADID), 운영체제 버전.</li>
              <li><strong>결제 시 수집 항목</strong>: 결제 승인 번호, 결제 금액, 결제 수단 정보(신용카드사명, 간편결제사명 등), 결제 일시 (실제 결제 카드번호나 비밀번호 등 민감 결제 정보는 PG사에서 처리하므로 회사는 보관하지 않습니다).</li>
              <li><strong>자동 생성 항목</strong>: 서비스 이용 기록(오디오 재생 시간, 마지막 청취 에피소드 파트 위치 등), 접속 IP 정보, 접속 쿠키(Cookie), 접속 로그, 불량 이용 기록.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제3조 (개인정보의 처리 및 보유 기간)</h2>
            <ul className="terms-bullet-list">
              <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 개인정보 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
              <li>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
                <br />- <strong>회원 탈퇴 시</strong>: 닉네임, 이메일 등 개인 회원정보는 탈퇴 완료 즉시 지체 없이 파기합니다.
                <br />- <strong>단, 관계 법령에 의한 경우</strong>:
                <br />• 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
                <br />• 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
                <br />• 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)
                <br />• 웹사이트 방문기록(로그인 기록): 3개월 (통신비밀보호법)
              </li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제4조 (개인정보의 파기절차 및 파기방법)</h2>
            <ul className="terms-bullet-list">
              <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</li>
              <li>정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.</li>
              <li>파기방법은 다음과 같습니다.
                <br />- 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 완전히 삭제합니다.
                <br />- 종이 문서에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
              </li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제5조 (개인정보의 제3자 제공 및 위탁)</h2>
            <ul className="terms-bullet-list">
              <li>회사는 이용자의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 이용자의 사전 동의 없이 범위를 초과하여 이용하거나 제3자에게 제공하지 않습니다. (단, 법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 제외)</li>
              <li>회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.
                <br />- 위탁 대상자: 결제 대행사(PG사 및 간편결제사)
                <br />- 위탁 업무 내용: 충전 및 멤버십/이용권 결제 처리, 본인인증
              </li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제6조 (정보주체의 권리와 그 행사방법)</h2>
            <ul className="terms-bullet-list">
              <li>이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
              <li>권리 행사는 회사에 대해 개인정보 보호법 시행령 제41조 제1항에 따라 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
              <li>회원 탈퇴는 마이페이지 내 '회원 탈퇴' 메뉴를 통해 본인이 직접 즉시 처리할 수 있습니다.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제7조 (개인정보의 기술적/관리적 보호대책)</h2>
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="terms-bullet-list">
              <li><strong>관리적 조치</strong>: 내부관리계획 수립 및 시행, 개인정보 취급 직원의 최소화 및 정기적 교육.</li>
              <li><strong>기술적 조치</strong>: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 비밀번호 및 고유식별정보의 암호화 저장, 보안프로그램(SSL 등) 설치.</li>
            </ul>
          </section>
 
          <section className="terms-section">
            <h2 className="terms-section-title">제8조 (개인정보 보호책임자)</h2>
            <ul className="terms-bullet-list">
              <li>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                <br />- 성명/직책: 고영광 (대표)
                <br />- 연락처: sun_writer@murimbook.com
              </li>
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