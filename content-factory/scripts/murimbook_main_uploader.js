const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { createClient } = require('@supabase/supabase-js');

// ── 1. env.local 로드 ──
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ 에러: SUPABASE 환경변수가 유실되었습니다. .env.local 파일을 확인하세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 2. 원고 정화 함수 ──
function cleanHtmlContent(content) {
  return content
    .replace(/```html\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/<p[^>]*>\s*📌\s*이미지\s*Alt\s*Text.*?<\/p>/gi, "")
    .replace(/📌\s*이미지\s*Alt\s*Text.*?\n/gi, "")
    .replace(/ALT_TEXT:\s*.*?\n/gi, "")
    .replace(/<!--\s*ALT_TEXT:\s*.*?\s*-->/gi, "")
    .replace(/\[ALT_TEXT:\s*.*?\]/gi, "")
    .replace(/\[X\]/g, "")
    .replace(/☒/g, "")
    .replace(/(독자\s*관점\s*소제목|세부\s*소제목|실전\s*적용법|주의사항\/체크리스트|비교\/분석|마무리|인간적\s*결론|공식\s*출처\s*링크|해시태그)\s*[\(]*[가-힣\s]*[\)]*\s*[:-]/g, "")
    .replace(/독자\s*관점\s*소제목\s*-\s*/g, "")
    .trim();
}

// ── 3. 총 10개 원고 정보 정의 ──
const postList = [
  // ── [예약 1~5번] +1시간부터 +5시간 뒤까지 ──
  {
    id: "post_government_loan_regulation_policy",
    folder_pattern: "시장_혼돈_키우는__정책실장_입",
    focus_kw: "정부 대출 규제 정책",
    title: "정부 대출 규제 정책 | 부동산 시장 혼란 속 직장인 한도 비교 전략",
    intro: "정부 대출 규제 정책은 최근 부동산 자산 시장의 향방을 가르는 가장 뜨거운 주제입니다. 이 글을 통해 시시각각 변화하는 규제 흐름 속에서 직장인들이 최선의 대출 한도를 확보하고 비교하는 실전 전략을 명확하게 제시해 드립니다.",
    hour_offset: 1
  },
  {
    id: "post_us_semiconductor_leverage_etf",
    folder_pattern: "반도체주_떨어졌다고요__3배로_베팅",
    focus_kw: "미국 반도체 레버리지",
    title: "미국 반도체 레버리지 | 3배 ETF 고위험 투자의 장단점 분석",
    intro: "미국 반도체 레버리지 투자는 최근 고수익을 노리는 서학개미들 사이에서 폭발적인 관심을 받고 있습니다. 고수익의 이면에 숨겨진 3배 레버리지 ETF의 치명적인 리스크와 장단점 분석을 통해 안전한 자산 관리 비법을 공유합니다.",
    hour_offset: 2
  },
  {
    id: "post_family_economy_education_museum",
    folder_pattern: "한국예탁결제원_증권박물관_인기",
    focus_kw: "가족 경제 교육 추천",
    title: "가족 경제 교육 추천 | 증권박물관 실물 전시를 활용한 문해력 공부법",
    intro: "가족 경제 교육 추천 장소로 손꼽히는 증권박물관은 자녀의 조기 경제 관념을 심어주기에 최적의 공간입니다. 실물 증권 전시물을 살펴보며 아이들의 금융 문해력을 쉽고 재미있게 키워줄 수 있는 구체적인 홈스쿨링 공부법을 정리했습니다.",
    hour_offset: 3
  },
  {
    id: "post_investor_deposit_market_forecast",
    folder_pattern: "개미들__실탄__떨어졌나",
    focus_kw: "투자자 예탁금 증시 전망",
    title: "투자자 예탁금 증시 전망 | 주식 실탄 감소가 자산 시장에 미치는 파장",
    intro: "투자자 예탁금 증시 전망은 향후 주식 시장의 반등 여부를 예측하는 중요한 선행 지표입니다. 개인 투자자들의 실탄이 감소함에 따라 향후 자산 시장에 미칠 파장과 포트폴리오 대응 요령을 정밀히 짚어봅니다.",
    hour_offset: 4
  },
  {
    id: "post_ai_semiconductor_technology_trends",
    folder_pattern: "백화점_아래_반도체_요람",
    focus_kw: "AI 반도체 기술 트렌드",
    title: "AI 반도체 기술 트렌드 | 카이스트 동탄 사이언스 허브 연구 현황 가이드",
    intro: "AI 반도체 기술 트렌드는 미래 디지털 경제 패권을 좌우할 핵심 기술 분야입니다. 동탄 롯데백화점 지하에 위치한 카이스트 사이언스 허브의 4개년 성과와 핵심 연구 현황 가이드를 통해 최첨단 IT 산업의 흐름을 조명합니다.",
    hour_offset: 5
  },
  // ── [발행 6~10번] +6시간부터 +10시간 뒤까지 ──
  {
    id: "post_card_point_cashback",
    folder_pattern: "신용카드_포인트_현금화",
    focus_kw: "카드 포인트 계좌입금",
    title: "카드 포인트 계좌입금 | 여신금융협회 통합 조회 및 즉시 현금화 방법",
    intro: "카드 포인트 계좌입금 방법은 잠자고 있는 카드 포인트를 한 번에 찾아 현금으로 돌려받을 수 있는 매우 간편하고 유익한 제도입니다. 카드사별 조회를 일일이 할 필요 없이 통합 계좌입금 신청법을 안내합니다.",
    hour_offset: 6
  },
  {
    id: "post_telecom_refund_inquiry",
    folder_pattern: "통신사_미환급금_조회",
    focus_kw: "통신사 미환급금 조회",
    title: "통신사 미환급금 조회 | SKT KT LGU+ 미수령 통신비 돌려받는 요령",
    intro: "통신사 미환급금 조회 제도를 활용하면 해지나 통신 요금 중복 납부로 인해 묵혀둔 미수령 통신비를 즉시 정산받을 수 있습니다. 누락 없이 100% 돌려받는 안전하고 유익한 조회 요령을 전해드립니다.",
    hour_offset: 7
  },
  {
    id: "post_samjeomsam_tax_refund",
    folder_pattern: "국세청_삼쩜삼",
    focus_kw: "삼쩜삼 환급금 조회",
    title: "삼쩜삼 환급금 조회 | 국세청 홈택스 기한후신고 세금 돌려받기 팁",
    intro: "삼쩜삼 환급금 조회 서비스를 통해 지난 5년간 누락되었던 종합소득세 숨은 환급 세금을 안전하게 환급받으실 수 있습니다. 기한 후 신고 시 수수료를 절감하고 홈택스에서 직접 신청해 환원받는 요령을 알아봅니다.",
    hour_offset: 8
  },
  {
    id: "post_hidden_bank_deposit_refund",
    folder_pattern: "은행_잠자는_계좌",
    focus_kw: "숨은 예금 찾기 요령",
    title: "숨은 예금 찾기 요령 | 내 계좌 한눈에 잠자는 휴면 예금 조회 방법",
    intro: "숨은 예금 찾기 요령을 통해 오랫동안 잊고 지낸 휴면 예금과 숨어 있는 보험금을 한 번에 통합 조회할 수 있습니다. 서민금융진흥원 및 내 계좌 한눈에 서비스를 활용한 정산 팁을 공유합니다.",
    hour_offset: 9
  },
  {
    id: "post_work_incentive_qualification",
    folder_pattern: "근로장려금_자녀장려금",
    focus_kw: "근로장려금 소득 자격",
    title: "근로장려금 소득 자격 | 2026 자녀장려금 지급일 및 신청 기준 표",
    intro: "근로장려금 소득 자격 기준은 저소득 근로자 가구의 실질 자립을 지원하기 위해 설계된 장려 세제 혜택 요건입니다. 가구 구성원별 단독, 홑벌이, 맞벌이 소득 한도 기준 표와 자녀장려금 신청 절차를 총정리합니다.",
    hour_offset: 10
  }
];

async function run() {
  console.log("=== 📚 무림북 메인 홈페이지 DB (Supabase) 10개 도움되는글 직접 적재 시작 ===");
  
  const baseNow = new Date();
  
  for (const post of postList) {
    const pid = post.id;
    
    // 1. 로컬 HTML 원본 파일 로드
    // content-factory 폴더 하위 전체를 재귀 검색하여 폴더명에 folder_pattern이 들어가는 HTML 파일 탐색
    const baseProjectDir = path.join(__dirname, '../..');
    const searchPattern = path.join(baseProjectDir, `content-factory/**/post.html`);
    const allHtmls = glob.sync(searchPattern.replace(/\\/g, '/'));
    
    let matchedFile = null;
    for (const fpath of allHtmls) {
      if (fpath.includes(post.folder_pattern)) {
        matchedFile = fpath;
        break;
      }
    }
    
    let contentHtml = "";
    if (matchedFile) {
      const rawContent = fs.readFileSync(matchedFile, 'utf8');
      contentHtml = cleanHtmlContent(rawContent);
      console.log(`  ✔ [${pid}] 로컬 파일 로드 완료: ${path.basename(path.dirname(matchedFile))}`);
    } else {
      contentHtml = `<p><strong>${post.focus_kw}</strong> — ${post.intro}</p><p>세부 정보 준비 중입니다. 본문을 확인하려면 나중에 다시 접속해주세요.</p>`;
      console.log(`  ⚠️  [${pid}] 로컬 HTML 없음 -> 기본 템플릿 사용`);
    }
    
    // 2. 썸네일 주소 빌드
    const thumbnailUrl = `https://image.murimbook.com/works/${pid}.jpg`;
    
    // 3. 예약 날짜 계산 (+1시간, +2시간 ...)
    const scheduledTime = new Date(baseNow.getTime() + post.hour_offset * 60 * 60 * 1000);
    const scheduledIso = scheduledTime.toISOString();
    
    // 4. Supabase DB Payload (thumbnail_url -> thumbnail 교정)
    const workPayload = {
      id: pid,
      title: post.title,
      description: contentHtml,
      subtitle: "[블로그]",
      status: "공개예정",
      thumbnail: thumbnailUrl,
      total_episodes: 1,
      free_episodes: 1,
      episode_count: 1,
      badge: "추천",
      created_at: scheduledIso
    };
    
    // 5. DB Upsert 실행
    const { data, error } = await supabase
      .from("works")
      .upsert(workPayload)
      .select();
      
    if (error) {
      console.error(`  ❌ [실패] ID: ${pid} -> 에러: ${error.message}`);
    } else {
      console.log(`  ✅ [성공] ${post.hour_offset}시간 뒤 예약 -> ID: ${pid} (${post.title.substring(0, 22)}...)`);
      console.log(`     - 예약 발행 시각: ${scheduledTime.toLocaleString("ko-KR")} (KST)`);
    }
  }
  
  console.log("\n=== 무림북 메인 홈페이지 10개 예약글 이식 완료! ===");
}

run();
