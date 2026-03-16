export default function RefundPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto leading-8">
        <h1 className="text-3xl font-bold mb-8">환불 및 결제 정책</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. 포인트 충전</h2>
          <p>
            무림북은 일부 콘텐츠 이용을 위해 포인트 충전 서비스를 제공할 수 있습니다.
            이용자는 사이트에서 안내된 결제 수단을 통해 포인트를 충전할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. 유료 콘텐츠 이용</h2>
          <p>
            포인트는 사이트 내 유료 콘텐츠 이용에 사용할 수 있으며,
            사용된 포인트는 원칙적으로 환불되지 않습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. 환불 가능 기준</h2>
          <p className="mb-3">
            다음의 경우 관련 법령에 따라 환불이 가능할 수 있습니다.
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>결제 오류로 인한 중복 결제</li>
            <li>서비스 장애로 인해 콘텐츠 이용이 불가능한 경우</li>
            <li>결제 후 콘텐츠를 전혀 이용하지 않은 경우</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. 환불 제한</h2>
          <p className="mb-3">
            다음의 경우 환불이 제한될 수 있습니다.
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>이미 이용한 콘텐츠에 사용된 포인트</li>
            <li>이용자의 단순 변심</li>
            <li>서비스 이용약관을 위반한 경우</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. 환불 요청 방법</h2>
          <p>
            환불 요청은 문의 페이지 또는 이메일을 통해 접수할 수 있습니다.
          </p>

          <p className="mt-3">
            이메일: contact@murimbook.com
          </p>
        </section>

        <p className="mt-10 text-sm text-gray-400">
          시행일: 2026-03-20
        </p>
      </div>
    </main>
  );
}