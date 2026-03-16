export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto leading-8">
        <h1 className="text-3xl font-bold mb-8">문의하기</h1>

        <p className="mb-6">
          무림북 이용 중 불편사항이나 문의가 있으시면 아래 이메일로 연락해 주세요.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">문의 가능 항목</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>로그인 및 회원가입 문제</li>
            <li>포인트 충전 및 결제 문의</li>
            <li>오디오 재생 오류</li>
            <li>콘텐츠 요청 및 기타 문의</li>
          </ul>
        </section>

        <section className="mb-8">
          <p className="mb-2">
            이메일: contact@murimbook.com
          </p>
          <p>운영시간: 평일 10:00 ~ 17:00</p>
        </section>
      </div>
    </main>
  );
}