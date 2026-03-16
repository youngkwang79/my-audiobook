export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto leading-8">
        <h1 className="text-3xl font-bold mb-8">이용약관</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제1조 목적</h2>
          <p>
            이 약관은 무림북이 제공하는 오디오북 및 스토리 콘텐츠 서비스의 이용과 관련하여
            회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제2조 서비스 내용</h2>
          <p>
            회사는 오디오 콘텐츠, 회차별 감상 서비스, 포인트 충전 및 유료 이용 기능 등을 제공합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제3조 회원 계정</h2>
          <p>
            이용자는 본인의 정확한 정보를 바탕으로 계정을 생성해야 하며,
            계정 정보의 관리 책임은 이용자 본인에게 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제4조 유료 서비스 및 포인트</h2>
          <p className="mb-3">
            포인트는 사이트 내 유료 콘텐츠 이용을 위해 사용할 수 있습니다.
          </p>
          <p>
            결제, 환불, 취소와 관련된 사항은 별도 안내 정책을 따릅니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제5조 저작권</h2>
          <p className="mb-3">
            사이트 내 모든 오디오, 이미지, 텍스트 및 기타 콘텐츠의 저작권은 회사 또는
            정당한 권리자에게 있습니다.
          </p>
          <p>
            이용자는 사전 허가 없이 이를 복제, 배포, 재판매할 수 없습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제6조 금지행위</h2>
          <p className="mb-3">이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>타인의 계정 도용</li>
            <li>서비스 운영 방해</li>
            <li>불법 복제 및 무단 배포</li>
            <li>결제 시스템 악용</li>
            <li>관련 법령 위반 행위</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제7조 서비스 변경 및 중단</h2>
          <p>
            회사는 운영상 또는 기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">제8조 문의</h2>
          <p>
            서비스 관련 문의는 Contact 페이지 또는 이메일을 통해 접수할 수 있습니다.
          </p>
        </section>

        <p className="mt-10 text-sm text-gray-400">시행일: 2026-03-20</p>
      </div>
    </main>
  );
}