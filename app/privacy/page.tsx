export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto leading-8">
        <h1 className="text-3xl font-bold mb-8">이용약관</h1>

        <p className="mb-6">
          무림북은 오디오 콘텐츠와 스토리 서비스를 제공하는 플랫폼으로,
          이용자는 본 약관에 따라 서비스를 이용할 수 있습니다.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. 서비스 목적</h2>
          <p>
            본 약관은 무림북이 제공하는 오디오북, 스토리, 기타 관련 서비스의
            이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을
            목적으로 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. 서비스 내용</h2>
          <p>
            무림북은 이용자에게 오디오 콘텐츠, 회차별 스토리, 자막 또는 관련
            부가 콘텐츠를 제공할 수 있으며, 서비스 내용은 운영상 필요에 따라
            변경될 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. 회원 계정</h2>
          <p>
            이용자는 회원가입 시 정확한 정보를 제공해야 하며, 계정 및 로그인
            정보의 관리 책임은 이용자 본인에게 있습니다. 이용자는 자신의 계정을
            제3자에게 양도하거나 대여할 수 없습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. 콘텐츠 이용</h2>
          <p>
            사이트에서 제공되는 모든 콘텐츠는 개인적인 감상 및 이용 목적으로만
            사용할 수 있습니다. 이용자는 회사 또는 정당한 권리자의 사전 허가 없이
            콘텐츠를 복제, 배포, 재판매, 전송하거나 상업적으로 이용할 수 없습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. 결제 및 포인트</h2>
          <p>
            무림북은 일부 유료 서비스 또는 포인트 기반 서비스를 제공할 수 있습니다.
            결제, 충전, 사용, 환불과 관련된 세부 사항은 별도로 안내되는 정책에
            따릅니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. 금지행위</h2>
          <p className="mb-3">이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>타인의 계정을 무단으로 사용하는 행위</li>
            <li>서비스 운영을 방해하거나 시스템에 과도한 부하를 주는 행위</li>
            <li>콘텐츠를 무단 복제, 배포, 공유, 판매하는 행위</li>
            <li>관련 법령 또는 공서양속에 반하는 행위</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. 서비스 변경 및 중단</h2>
          <p>
            회사는 운영상 또는 기술상 필요에 따라 서비스의 전부 또는 일부를
            변경하거나 중단할 수 있습니다. 다만, 이용자에게 중대한 영향을 주는
            경우에는 사전에 공지하도록 노력합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. 책임의 제한</h2>
          <p>
            회사는 천재지변, 시스템 장애, 이용자의 귀책사유 등 회사의 합리적인
            통제 범위를 벗어난 사유로 발생한 손해에 대해서는 책임을 제한할 수
            있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. 문의</h2>
          <p>
            서비스 이용과 관련한 문의는 아래 이메일로 접수할 수 있습니다.
            <br />
            이메일: contact@murimbook.com
          </p>
        </section>

        <p className="mt-10 text-sm text-gray-400">시행일: 2026-03-20</p>
      </div>
    </main>
  );
}