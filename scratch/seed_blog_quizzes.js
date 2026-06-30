const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const parts = trimmed.split("=");
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const quizzes = [
  // ==========================================
  // Post 1: nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건
  // ==========================================
  {
    blog_title: "nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건",
    blog_url: "https://blog.murimbook.com/?p=116",
    pair_index: 0,
    q1_question: "NH농협금융지주 정기예금의 2026년 기준 최고 이율로 본문에 언급된 수치는 몇 %인가요?",
    q1_options: ["2.60%", "3.80%", "4.50%"],
    q1_answer: 0,
    q2_question: "NH농협의 대표적인 비대면 전용 정기예금 상품의 명칭은 무엇인가요?",
    q2_options: ["NH올원e예금", "NH드림정기예금", "농협비대면플러스예금"],
    q2_answer: 0
  },
  {
    blog_title: "nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건",
    blog_url: "https://blog.murimbook.com/?p=116",
    pair_index: 1,
    q1_question: "정기예금 가입 시 예금자보호법에 따라 원금과 이자를 합해 1인당 보호받을 수 있는 최고 한도는 얼마인가요?",
    q1_options: ["3천만원", "5천만원", "1억원"],
    q1_answer: 1,
    q2_question: "NH농협은행의 대표 비대면 상품인 'NH올원e예금'의 가입 가능 최소 금액은 얼마인가요?",
    q2_options: ["1만원 이상", "5만원 이상", "10만원 이상"],
    q2_answer: 2
  },
  {
    blog_title: "nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건",
    blog_url: "https://blog.murimbook.com/?p=116",
    pair_index: 2,
    q1_question: "비대면 채널로 정기예금을 가입할 때 영업점 방문 대비 가장 큰 장점으로 설명된 것은 무엇인가요?",
    q1_options: ["추가 우대금리 또는 높은 기본 이율", "직접 대면 상담 가능", "사은품 상시 지급"],
    q1_answer: 0,
    q2_question: "예금 가입 시 이자소득에 부과되는 이자소득세의 기본 세율은 몇 %인가요?",
    q2_options: ["10.0%", "14.0%", "15.4%"],
    q2_answer: 2
  },
  {
    blog_title: "nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건",
    blog_url: "https://blog.murimbook.com/?p=116",
    pair_index: 3,
    q1_question: "비과세종합저축으로 가입하여 이자소득세를 면제받을 수 있는 기본 대상자의 연령 기준은 만 몇 세 이상인가요?",
    q1_options: ["만 60세", "만 65세", "만 70세"],
    q1_answer: 1,
    q2_question: "만기 전에 예금을 해지할 때 받는 불이익에 대해 본문에서 언급한 내용은 무엇인가요?",
    q2_options: ["중도해지 이율이 적용되어 훨씬 낮은 이자가 지급됨", "원금의 일부가 차감됨", "향후 농협 거래가 영구 중지됨"],
    q2_answer: 0
  },
  {
    blog_title: "nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건",
    blog_url: "https://blog.murimbook.com/?p=116",
    pair_index: 4,
    q1_question: "비대면 가입 시 본인 확인을 위해 필요한 신분증으로 언급되지 않은 것은 무엇인가요?",
    q1_options: ["주민등록증", "운전면허증", "사원증"],
    q1_answer: 2,
    q2_question: "NH농협 정기예금의 가입 기간은 최소 몇 개월부터 설정할 수 있나요?",
    q2_options: ["1개월", "3개월", "6개월"],
    q2_answer: 0
  },

  // ==========================================
  // Post 2: 청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250
  // ==========================================
  {
    blog_title: "청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250",
    blog_url: "https://blog.murimbook.com/?p=34",
    pair_index: 0,
    q1_question: "청년도약계좌의 기본 만기 기간은 총 몇 년인가요?",
    q1_options: ["3년", "5년", "7년"],
    q1_answer: 1,
    q2_question: "청년도약계좌 가입을 위한 개인 소득 총 급여 기준 한도는 연간 얼마 이하인가요?",
    q2_options: ["총 급여 5,000만 원 이하", "총 급여 6,000만 원 이하", "총 급여 7,500만 원 이하"],
    q2_answer: 2
  },
  {
    blog_title: "청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250",
    blog_url: "https://blog.murimbook.com/?p=34",
    pair_index: 1,
    q1_question: "청년도약계좌 가입이 가능한 기본 만 나이 조건은 어떻게 되나요?",
    q1_options: ["만 19세 이상 ~ 만 34세 이하", "만 20세 이상 ~ 만 39세 이하", "만 19세 이상 ~ 만 29세 이하"],
    q1_answer: 0,
    q2_question: "병역 이행 기간은 청년도약계좌 나이 계산에서 제외되는데, 최대 몇 년까지 차감되나요?",
    q2_options: ["최대 3년", "최대 5년", "최대 6년"],
    q2_answer: 2
  },
  {
    blog_title: "청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250",
    blog_url: "https://blog.murimbook.com/?p=34",
    pair_index: 2,
    q1_question: "청년도약계좌 가입을 위한 가구 소득 기준은 기준 중위소득 몇 % 이하인가요?",
    q1_options: ["중위소득 100% 이하", "중위소득 180% 이하", "중위소득 250% 이하"],
    q1_answer: 2,
    q2_question: "개인 소득이 몇만 원을 초과하면 정부 기여금은 받지 못하고 비과세 혜택만 적용되나요?",
    q2_options: ["6,000만 원 초과", "7,000만 원 초과", "7,500만 원 초과"],
    q2_answer: 0
  },
  {
    blog_title: "청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250",
    blog_url: "https://blog.murimbook.com/?p=34",
    pair_index: 3,
    q1_question: "청년도약계좌 가입 시 정부가 개인 소득 수준에 따라 지원해주는 정부 기여금의 월 최대 금액은 얼마인가요?",
    q1_options: ["월 최대 1.5만 원", "월 최대 2.4만 원", "월 최대 3.0만 원"],
    q1_answer: 1,
    q2_question: "청년도약계좌와 중복 가입이 불가능한 것으로 명시된 적금 상품명은 무엇인가요?",
    q2_options: ["청년희망적금", "청년내일저축계좌", "둘 다 중복 불가"],
    q2_answer: 2
  },
  {
    blog_title: "청년도약계좌 가입 조건 2026 나이 소득 기준 중위소득 250",
    blog_url: "https://blog.murimbook.com/?p=34",
    pair_index: 4,
    q1_question: "본문에서 2026년 4인 가구 기준 중위소득 250% 소득 기준 금액으로 제시된 금액은 얼마인가요?",
    q1_options: ["10,500,000원", "14,324,783원", "15,500,000원"],
    q1_answer: 1,
    q2_question: "가입을 제한하기 위해 직전 3개년도 중 1회 이상 해당 여부를 조회하는 과세 대상은 무엇인가요?",
    q2_options: ["종합부동산세", "금융소득종합과세", "양도소득세"],
    q2_answer: 1
  },

  // ==========================================
  // Post 3: 신용점수 올리는 법 30일 안에 올리는 방법 체크리스트
  // ==========================================
  {
    blog_title: "신용점수 올리는 법 30일 안에 올리는 방법 체크리스트",
    blog_url: "https://blog.murimbook.com/?p=56",
    pair_index: 0,
    q1_question: "신용점수를 단기간에 올려야 할 때 가장 먼저 치명적이므로 최우선 해결하라고 한 요소는 무엇인가요?",
    q1_options: ["연체 정보 해결", "대출 새로 받기", "통신비 한도 증액"],
    q1_answer: 0,
    q2_question: "신용점수 평가 요소 중 NICE평가정보에서 가장 큰 비중(34%)을 차지하는 것은 무엇인가요?",
    q2_options: ["신용거래 기간", "부채 수준", "상환 이력"],
    q2_answer: 2
  },
  {
    blog_title: "신용점수 올리는 법 30일 안에 올리는 방법 체크리스트",
    blog_url: "https://blog.murimbook.com/?p=56",
    pair_index: 1,
    q1_question: "신용카드를 사용할 때, 한도 대비 몇 % 수준으로 유지하는 것이 신용점수 관리에 가장 유리한가요?",
    q1_options: ["90~100% 가득 채워 사용", "30~50% 수준 사용", "매달 무조건 10% 이하만 사용"],
    q1_answer: 1,
    q2_question: "할부 거래와 비교했을 때, 신용점수 관리에 더 유리한 카드 결제 방식은 무엇인가요?",
    q2_options: ["일시불 결제", "장기 할부", "리볼빙 결제"],
    q2_answer: 0
  },
  {
    blog_title: "신용점수 올리는 법 30일 안에 올리는 방법 체크리스트",
    blog_url: "https://blog.murimbook.com/?p=56",
    pair_index: 2,
    q1_question: "NICE평가정보나 KCB 등 신용평가사 및 금융 앱을 통해 무료로 신용점수를 조회할 수 있는 횟수는 연간 최소 몇 회 이상인가요?",
    q1_options: ["연 1회", "연 2회", "연 3회"],
    q1_answer: 2,
    q2_question: "신용거래가 없는 학생이나 초년생들을 위해 공과금 납부 내역 등을 제출하여 가점을 얻는 제도는 무엇인가요?",
    q2_options: ["비금융 정보 등록", "대출 통합 심사", "신용카드 우대 신청"],
    q2_answer: 0
  },
  {
    blog_title: "신용점수 올리는 법 30일 안에 올리는 방법 체크리스트",
    blog_url: "https://blog.murimbook.com/?p=56",
    pair_index: 3,
    q1_question: "신용점수 조회 시 점수가 깎일까 걱정하는 사람들에게 본문이 제시한 팩트는 무엇인가요?",
    q1_options: ["조회 시마다 10점씩 하락함", "조회는 신용점수에 아무런 영향을 미치지 않음", "자주 조회하면 보너스 점수를 줌"],
    q1_answer: 1,
    q2_question: "대출을 관리할 때 신용점수 향상 측면에서 가장 유리한 대출 상환 방식은 무엇인가요?",
    q2_options: ["여러 개의 소액 대출을 보유하기", "불필요한 대출을 상환해 대출 건수를 줄이기", "매달 여러 카드사 카드론 사용하기"],
    q2_answer: 1
  },
  {
    blog_title: "신용점수 올리는 법 30일 안에 올리는 방법 체크리스트",
    blog_url: "https://blog.murimbook.com/?p=56",
    pair_index: 4,
    q1_question: "본문에서 통신비나 공과금을 몇 개월 이상 성실히 납부하면 신용 가점을 받을 수 있다고 추천하나요?",
    q1_options: ["공과금 성실 납부 및 신용평가사 직접 제출", "단 1개월 납부만으로 50점 가점", "건강보험 연체 이력 제출"],
    q1_answer: 0,
    q2_question: "신용점수에 악영향을 주므로 급전 목적이라도 사용을 극구 자제해야 한다고 한 신용카드 대출 서비스 종류는 무엇인가요?",
    q2_options: ["일시불 선결제", "현금서비스 및 카드론", "카드 포인트 충전"],
    q2_answer: 1
  }
];

async function seed() {
  console.log(`Starting to seed ${quizzes.length} quiz records into Supabase...`);
  
  for (const item of quizzes) {
    const { data, error } = await supabase
      .from("blog_quizzes")
      .upsert(
        {
          blog_title: item.blog_title,
          blog_url: item.blog_url,
          pair_index: item.pair_index,
          q1_question: item.q1_question,
          q1_options: item.q1_options,
          q1_answer: item.q1_answer,
          q2_question: item.q2_question,
          q2_options: item.q2_options,
          q2_answer: item.q2_answer,
          created_at: new Date().toISOString()
        },
        { onConflict: "blog_title,pair_index" }
      );

    if (error) {
      console.error(`Failed to insert quiz pair ${item.pair_index} for "${item.blog_title}":`, error.message);
    } else {
      console.log(`Successfully upserted pair ${item.pair_index} for "${item.blog_title}"`);
    }
  }
  
  console.log("Seeding process completed!");
}

seed().catch(console.error);
