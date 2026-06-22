import { useState, useEffect } from "react";
import html2canvas from "html2canvas";

export default function ContentFactoryPanel() {
  const [query, setQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);

  // Selected keyword & generation states
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [extraFact, setExtraFact] = useState("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [selectedMainTheme, setSelectedMainTheme] = useState(0);

  // SNS Refactoring states
  const [loadingRefactor, setLoadingRefactor] = useState(false);
  const [refactorData, setRefactorData] = useState<{
    shorts: string;
    cardNews: any;
    xThread: string;
  } | null>(null);
  const [activeSnsTab, setActiveSnsTab] = useState<"shorts" | "cards" | "x">("shorts");
  const [cardTheme, setCardTheme] = useState<"navy" | "beige" | "white">("navy");

  // Publishing states
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    postId: string | null;
    editLink: string | null;
  } | null>(null);

  const [googleTrends, setGoogleTrends] = useState<any[]>([]);
  const [loadingGoogleTrends, setLoadingGoogleTrends] = useState(false);

  // 11대 고수익 테마 및 110개 하위 카테고리 정의
  const profitThemes = [
    {
      name: "🏦 금융/재테크",
      tip: "전문성 확보: 금융 지식은 신뢰가 생명입니다. 구체적인 이자율 계산이나 혜택 비교 표를 추가하면 체류 시간이 급증합니다.",
      subcategories: [
        "20대 직장인 적금 추천", "파킹통장 금리 비교", "청년도약계좌 가입 조건", "CMA 통장 이자 수익", "신용대출 금리 낮추는 법", 
        "비상금 대출 조건", "카드론 상환 팁", "신용점수 올리는 법", "환전 수수료 우대 은행", "해외송금 저렴하게 하는 법"
      ]
    },
    {
      name: "💳 신용/체크카드",
      tip: "타겟 명확화: '20대 사회초년생', '주부 마트 할인' 등 타겟을 좁혀서 체감 혜택 금액(예: 월 5만 원 절약)을 명시하세요.",
      subcategories: [
        "사회초년생 신용카드 추천", "통신비 할인 카드", "주유 할인 카드 비교", "배달앱 할인 체크카드", "마트 할인 카드 추천", 
        "마일리지 적립 카드", "무실적 혜택 카드", "공과금 할인 신용카드", "해외결제 수수료 면제 카드", "프리미엄 바우처 카드"
      ]
    },
    {
      name: "🚗 자동차/교통",
      tip: "비교 정보 제공: 다이렉트 보험료 비교, 연비 비교 등 여러 항목을 비교 분석해주는 글이 광고 클릭률(CPC)이 가장 높습니다.",
      subcategories: [
        "다이렉트 자동차보험 비교", "운전자보험 필수 특약", "중고차 구매 시 주의사항", "신차 장기렌트 장단점", "자동차 취등록세 계산", 
        "하이브리드 자동차 혜택", "알뜰교통카드 신청", "주차위반 과태료 조회", "하이패스 단말기 등록", "엔진오일 교환 주기"
      ]
    },
    {
      name: "💸 세금/연말정산",
      tip: "시즌성 공략 & 최신화: 매년 바뀌는 세법을 가장 먼저 업데이트하세요. '돌려받는 숨은 돈 찾기' 뉘앙스가 가장 잘 먹힙니다.",
      subcategories: [
        "연말정산 소득공제 꿀팁", "종합소득세 신고 방법", "월세 세액공제 조건", "개인사업자 부가세 신고", "청년 소득세 감면", 
        "국세환급금 조회 방법", "부동산 취득세 계산", "양도소득세 면제 조건", "상속세/증여세 절세", "건강보험료 피부양자 자격"
      ]
    },
    {
      name: "🏠 부동산/주거",
      tip: "법률/주의사항 강조: '계약 시 반드시 확인해야 할 특약 5가지'처럼 피해를 예방하는 정보가 체류시간을 극대화합니다.",
      subcategories: [
        "버팀목 전세자금대출", "신생아 특례대출 조건", "청약 가점 계산법", "전세보증금 반환보증", "월세 보증금 지키는 법", 
        "아파트 실거래가 조회", "임대차 3법 핵심 요약", "공공임대주택 입주 자격", "부동산 중개수수료 계산", "오피스텔 매매 주의사항"
      ]
    },
    {
      name: "🏥 건강/의료",
      tip: "주의사항: 의학 정보는 YMYL(Your Money or Your Life)로 구글이 엄격히 심사합니다. '전문가 상담 권장' 문구를 꼭 넣고 객관적 사실 위주로 적으세요.",
      subcategories: [
        "실비보험 청구 서류", "치아보험 가입 조건", "3대 질병 진단비", "태아보험 가입 시기", "건강검진 대상자 조회", 
        "당뇨 초기 증상", "고혈압 낮추는 방법", "눈 영양제 루테인 비교", "다이어트 보조제 성분", "탈모 치료제 부작용"
      ]
    },
    {
      name: "🏛️ 정부지원/복지",
      tip: "행동 유도(CTA): '지금 당장 신청하기', '지원금 조회하기' 같은 직관적인 버튼이나 링크 배치를 통해 다음 행동을 유도하세요.",
      subcategories: [
        "근로장려금 신청 자격", "국민내일배움카드 발급", "기초연금 수급 자격", "청년도약계좌 신청", "서울시 임산부 교통비", 
        "실업급여 수급 조건", "아이돌봄 서비스 신청", "소상공인 대환대출", "에너지 바우처 신청", "국민연금 예상수령액"
      ]
    },
    {
      name: "📱 IT/통신비",
      tip: "가성비 소구: 통신비 인하, 알뜰폰 요금제 비교 등 고정 지출을 줄여주는 '절약 가이드' 형태가 꾸준한 트래픽을 만듭니다.",
      subcategories: [
        "알뜰폰 요금제 비교", "아이폰 자급제 싸게 사는 법", "인터넷 가입 현금 사은품", "유튜브 프리미엄 우회", "OTT 공유 사이트", 
        "데이터 무제한 요금제", "스마트폰 배터리 절약", "노트북 가성비 추천", "아이패드 모델 비교", "VPN 추천 및 활용"
      ]
    },
    {
      name: "💼 취업/이직",
      tip: "실전 예시 제공: 단순 개념보다는 합격 자소서 예시, 면접 예상 질문 등 '템플릿' 형태를 제공하면 공유(Share)가 일어납니다.",
      subcategories: [
        "이력서 자기소개서 예시", "퇴직금 계산기", "실업급여 조건", "국비지원 코딩부트캠프", "면접 1분 자기소개", 
        "경력기술서 작성법", "연봉 협상 노하우", "재택근무 알바 추천", "프리랜서 세금 신고", "외국계 기업 영문 이력서"
      ]
    },
    {
      name: "🤖 AI/자동화",
      tip: "최신 정보 업데이트: 변화가 빠른 분야이므로 최신 AI 툴(GPT-4o, Claude 등)의 실사용 후기와 활용법(수익화) 위주로 작성하세요.",
      subcategories: [
        "챗GPT 프롬프트 모음", "AI 이미지 생성 사이트", "미드저니 사용법", "블로그 자동화 프로그램", "AI 동영상 제작 툴", 
        "노션 AI 활용법", "파이썬 업무 자동화", "구글 시트 크롤링", "유튜브 쇼츠 자동 생성", "AI 목소리 더빙 프로그램"
      ]
    },
    {
      name: "✈️ 여행/항공권",
      tip: "리스트형 구조: '오사카 3박 4일 일정', '기내 반입 금지 물품 10가지' 등 번호가 매겨진 리스트형 글이 SEO에 유리합니다.",
      subcategories: [
        "항공권 싸게 예매하는 법", "스카이스캐너 활용법", "오사카 여행 코스", "다낭 풀빌라 추천", "해외여행자 보험 비교", 
        "트래블로그 카드 환전", "비짓재팬웹 등록", "여권 발급 준비물", "제주도 렌트카 비교", "공항 라운지 무료 카드"
      ]
    }
  ];

  // 🔄 세션 데이터 복원 이펙트 (최초 1회 실행)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedQuery = localStorage.getItem("cf_query") || "";
      const savedTrends = localStorage.getItem("cf_trends");
      const savedSelectedKeyword = localStorage.getItem("cf_selectedKeyword");
      const savedSuggestedTitle = localStorage.getItem("cf_suggestedTitle") || "";
      const savedExtraFact = localStorage.getItem("cf_extraFact") || "";
      const savedGeneratedMarkdown = localStorage.getItem("cf_generatedMarkdown") || "";
      const savedRefactorData = localStorage.getItem("cf_refactorData");

      if (savedQuery) setQuery(savedQuery);
      if (savedTrends) setTrends(JSON.parse(savedTrends));
      if (savedSelectedKeyword) setSelectedKeyword(savedSelectedKeyword);
      if (savedSuggestedTitle) setSuggestedTitle(savedSuggestedTitle);
      if (savedExtraFact) setExtraFact(savedExtraFact);
      if (savedGeneratedMarkdown) setGeneratedMarkdown(savedGeneratedMarkdown);
      if (savedRefactorData) setRefactorData(JSON.parse(savedRefactorData));
    }
  }, []);

  // 💾 상태 데이터 동기화 백업 유틸리티 함수
  const saveStateToLocalStorage = (key: string, value: any) => {
    if (typeof window !== "undefined") {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  };

  // 작업 패널 초기화 (새 시작용)
  const handleClearAll = () => {
    if (confirm("진행 중인 모든 콘텐츠 팩토리 임시 기획 데이터를 삭제하고 초기화하시겠습니까?")) {
      setQuery("");
      setTrends([]);
      setSelectedKeyword(null);
      setSuggestedTitle("");
      setGeneratedMarkdown("");
      setExtraFact("");
      setRefactorData(null);
      setPublishResult(null);

      const keys = ["cf_query", "cf_trends", "cf_selectedKeyword", "cf_suggestedTitle", "cf_extraFact", "cf_generatedMarkdown", "cf_refactorData"];
      keys.forEach(k => localStorage.removeItem(k));
    }
  };

  // Helper: Get Auth Token
  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      const sessionStr = window.localStorage.getItem("supabase.auth.token");
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          return parsed?.currentSession?.access_token || null;
        } catch (e) {
          console.error(e);
        }
      }
    }
    // Fallback: look in session storage or cookies if needed
    return null;
  };

  // Action 0: Load Google Trends
  const loadGoogleTrends = async () => {
    setLoadingGoogleTrends(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "trends" })
      });
      const data = await res.json();
      if (res.ok && data?.trends) {
        setGoogleTrends(data.trends);
      } else {
        alert("구글 실시간 트렌드를 가져오는데 실패했습니다.");
      }
    } catch (e: any) {
      alert(`트렌드 수집 중 에러: ${e.message}`);
    } finally {
      setLoadingGoogleTrends(false);
    }
  };

  // Action 1: Search Trends
  const handleSearch = async (overrideQuery?: string | React.MouseEvent) => {
    const searchQuery = typeof overrideQuery === "string" ? overrideQuery : query;
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    setTrends([]);
    setGeneratedMarkdown("");
    setSelectedKeyword(null);
    setSuggestedTitle("");
    setRefactorData(null);
    setPublishResult(null);

    // 검색 실행 전 쿼리 선행 저장
    saveStateToLocalStorage("cf_query", searchQuery);
    saveStateToLocalStorage("cf_trends", null);
    saveStateToLocalStorage("cf_selectedKeyword", null);
    saveStateToLocalStorage("cf_suggestedTitle", null);
    saveStateToLocalStorage("cf_generatedMarkdown", null);
    saveStateToLocalStorage("cf_refactorData", null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "search", query: searchQuery })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`서버 응답 오류 (상태: ${res.status}): ${text.substring(0, 100)}...`);
      }

      if (res.ok && data?.trends) {
        setTrends(data.trends);
        saveStateToLocalStorage("cf_trends", data.trends);
      } else {
        alert(`트렌드 검색 실패: ${data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Action 2: Generate Blog
  const handleGenerate = async (keyword: string, titleSuggestion: string) => {
    setSelectedKeyword(keyword);
    setSuggestedTitle(titleSuggestion);
    setLoadingGenerate(true);
    setGeneratedMarkdown("");
    setRefactorData(null);
    setPublishResult(null);

    saveStateToLocalStorage("cf_selectedKeyword", keyword);
    saveStateToLocalStorage("cf_suggestedTitle", titleSuggestion);
    saveStateToLocalStorage("cf_generatedMarkdown", null);
    saveStateToLocalStorage("cf_refactorData", null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "generate", keyword, title: titleSuggestion, extraFact })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`서버 응답 오류 (상태: ${res.status}): ${text.substring(0, 100)}...`);
      }

      if (res.ok && data?.markdown) {
        setGeneratedMarkdown(data.markdown);
        saveStateToLocalStorage("cf_generatedMarkdown", data.markdown);
      } else {
        alert(`블로그 작성 실패: ${data?.error || "unknown"}\n상세: ${data?.details || ""}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingGenerate(false);
    }
  };

  // Action 3: Refactor for Platforms
  const handleRefactor = async () => {
    if (!selectedKeyword) return;
    setLoadingRefactor(true);
    setRefactorData(null);
    saveStateToLocalStorage("cf_refactorData", null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "refactor", keyword: selectedKeyword })
      });
      const data = await res.json();
      if (res.ok) {
        const refObj = {
          shorts: data.shorts,
          cardNews: data.cardNews,
          xThread: data.xThread
        };
        setRefactorData(refObj);
        saveStateToLocalStorage("cf_refactorData", refObj);
      } else {
        alert(`재가공 실패: ${data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingRefactor(false);
    }
  };

  // Action 4: Publish to WordPress
  const handlePublish = async () => {
    if (!selectedKeyword) return;
    setLoadingPublish(true);
    setPublishResult(null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "publish", keyword: selectedKeyword, title: suggestedTitle })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPublishResult({
          postId: data.postId,
          editLink: data.editLink
        });
        alert("워드프레스 임시저장 발행이 완료되었습니다!");
      } else {
        alert(`워드프레스 발행 실패: ${data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingPublish(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다!");
  };

  const downloadCard = async (slideIndex: number) => {
    const element = document.getElementById(`card-slide-${slideIndex}`);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${selectedKeyword || "card"}_slide_${slideIndex}.png`;
      link.click();
    } catch (e) {
      alert("이미지 렌더링에 실패했습니다.");
    }
  };

  const getThemeStyles = () => {
    switch(cardTheme) {
      case "beige": return { bg: "#fdf8f5", text: "#4a3b32", point: "#ff6b35" };
      case "white": return { bg: "#ffffff", text: "#2c3e50", point: "#3498db" };
      case "navy": default: return { bg: "#0f172a", text: "#f8fafc", point: "#fbbf24" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Keyword Intake Section */}
      <div className="card-panel">
        <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🔍</span> Perplexity 트렌드 및 롱테일 소재 발굴
        </h3>
        
        {/* 고수익 11대 테마 및 하위 카테고리 (2-Depth) */}
        <div style={{ marginBottom: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "16px" }}>
          
          {/* 1-Depth: 대주제 탭 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {profitThemes.map((theme, i) => (
              <button
                key={i}
                onClick={() => setSelectedMainTheme(i)}
                style={{
                  background: selectedMainTheme === i ? "rgba(255, 215, 0, 0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedMainTheme === i ? "#ffd700" : "rgba(255,255,255,0.1)"}`,
                  color: selectedMainTheme === i ? "#ffd700" : "#d1d1d6",
                  fontWeight: selectedMainTheme === i ? "800" : "400",
                  fontSize: "13px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {theme.name}
              </button>
            ))}
          </div>

          {/* 블로그 운영 팁 */}
          <div style={{ background: "rgba(255, 42, 95, 0.1)", borderLeft: "4px solid #ff2a5f", padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "16px" }}>
            <h4 style={{ color: "#ff2a5f", fontSize: "13px", fontWeight: "800", marginBottom: "4px" }}>💡 블로그 운영 팁</h4>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", lineHeight: "1.5" }}>
              {profitThemes[selectedMainTheme].tip}
            </p>
          </div>

          {/* 2-Depth: 하위 카테고리 키워드 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {profitThemes[selectedMainTheme].subcategories.map((sub, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sub);
                  saveStateToLocalStorage("cf_query", sub);
                  handleSearch(sub);
                }}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "white",
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              >
                # {sub}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px", lineHeight: "1.5" }}>
          구글/네이버에서 많은 사람이 찾지만 기존 검색결과의 정보가 미비하여 '공급 부족(Content Gap)' 상태인 블루오션 키워드와 구체적인 검색 의도를 분석해 냅니다.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="주요 분야나 대주제 키워드를 입력하세요 (예: Next.js 에러, 인공지능 수익화)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              saveStateToLocalStorage("cf_query", e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="btn-submit"
            style={{ width: "160px", height: "42px", flexShrink: 0 }}
            onClick={handleSearch}
            disabled={loadingSearch || !query.trim()}
          >
            {loadingSearch ? "트렌드 검색 중..." : "AI 검색 & 분석"}
          </button>
          <button
            onClick={handleClearAll}
            style={{
              width: "110px",
              height: "42px",
              flexShrink: 0,
              background: "rgba(255, 69, 58, 0.1)",
              border: "1px solid #ff453a",
              color: "#ff453a",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            초기화 🔄
          </button>
        </div>

        {/* 실시간 구글 트렌드 추천 블록 */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#a1a1a6" }}>📈 현재 대한민국 실시간 급상승 키워드</span>
            <button
              onClick={loadGoogleTrends}
              disabled={loadingGoogleTrends}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffd700",
                fontSize: "11px",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              {loadingGoogleTrends ? "조회 중..." : "실시간 키워드 갱신 🔄"}
            </button>
          </div>
          
          {googleTrends.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {googleTrends.map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setQuery(t.keyword);
                    saveStateToLocalStorage("cf_query", t.keyword);
                    handleSearch(t.keyword); // 클릭 즉시 실시간 분석 검색 실행
                  }}
                  style={{
                    background: "rgba(255, 215, 0, 0.05)",
                    border: "1px solid rgba(255, 215, 0, 0.15)",
                    borderRadius: "20px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#ffd700",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 215, 0, 0.15)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 215, 0, 0.05)")}
                >
                  #{t.keyword} <span style={{ opacity: 0.5, fontSize: "10px" }}>({t.traffic})</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", opacity: 0.5 }}>우측 갱신 버튼을 눌러 실시간 화두를 확인해 보세요!</p>
          )}
        </div>
      </div>

      {/* 2. Trends List */}
      {trends.length > 0 && (
        <div className="card-panel">
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "16px", color: "#ffd700" }}>
            🎯 추천 롱테일 키워드 후보군 (Content Gaps)
          </h3>
          
          <div style={{ marginBottom: "20px", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px dashed rgba(255,215,0,0.3)" }}>
            <label className="form-label" style={{ marginBottom: "8px", color: "#ffd700" }}>📌 참조 팩트 / 타겟 URL 주입 (선택 사항)</label>
            <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "10px" }}>AI가 거짓 정보를 지어내지 않도록, 실제 진행 중인 할인 혜택 수치나 이벤트 안내 페이지 URL을 입력해두면 가장 최우선 팩트로 반영됩니다.</p>
            <textarea
              className="form-textarea"
              style={{ height: "60px", fontSize: "13px" }}
              placeholder="예: 신규가입 30% 할인쿠폰 지급, 카카오톡 채널 추가 시 5천원 중복할인 (https://example.com/event)"
              value={extraFact}
              onChange={(e) => {
                setExtraFact(e.target.value);
                saveStateToLocalStorage("cf_extraFact", e.target.value);
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {trends.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#ffd700" }}>{item.keyword}</span>
                    <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 6px", marginLeft: "8px", verticalAlign: "middle" }}>
                      {item.intent}
                    </span>
                  </div>
                  <button
                    className="btn-submit"
                    style={{ width: "130px", height: "32px", fontSize: "12px", borderRadius: "8px" }}
                    onClick={() => handleGenerate(item.keyword, item.suggested_title)}
                    disabled={loadingGenerate}
                  >
                    이 글 작성하기
                  </button>
                </div>
                <div style={{ fontSize: "13px", color: "#d1d1d6", lineHeight: "1.4" }}>
                  <strong>검색 의도:</strong> {item.search_intent_description}
                </div>
                <div style={{ fontSize: "13px", color: "#ff453a", lineHeight: "1.4" }}>
                  <strong>틈새(C-Gap) 이유:</strong> {item.content_gap_reason}
                </div>
                <div style={{ fontSize: "13px", color: "#30d158", lineHeight: "1.4" }}>
                  <strong>권장 제목:</strong> {item.suggested_title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Generating Blog State */}
      {loadingGenerate && (
        <div className="card-panel" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "24px", animation: "spin 1.5s linear infinite", display: "inline-block", marginBottom: "16px" }}>✍️</div>
          <h4 style={{ fontWeight: "800", fontSize: "16px" }}>글 작성 엔진 가동 중...</h4>
          <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "8px" }}>
            선택한 키워드 `{selectedKeyword}`에 맞추어 고품질 SEO 심층 블로그 포스트를 생산하고 있습니다. (약 30~50초 소요)
          </p>
        </div>
      )}

      {/* 4. Generated Post Preview */}
      {generatedMarkdown && (
        <div className="card-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#ffd700" }}>
              📝 생성 완료: 블로그 포스트 초안
            </h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-submit"
                style={{ width: "120px", height: "34px", fontSize: "12px", borderRadius: "8px", background: "linear-gradient(135deg, #30d158 0%, #10b981 100%)" }}
                onClick={handlePublish}
                disabled={loadingPublish}
              >
                {loadingPublish ? "워드프레스 배포 중..." : "워드프레스 발행"}
              </button>
              <button
                className="btn-submit"
                style={{ width: "120px", height: "34px", fontSize: "12px", borderRadius: "8px", background: "linear-gradient(135deg, #ff9f0a 0%, #ff7f00 100%)" }}
                onClick={handleRefactor}
                disabled={loadingRefactor}
              >
                {loadingRefactor ? "SNS 가공 중..." : "SNS 멀티채널 가공"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="form-label" style={{ marginBottom: "6px" }}>게시글 제목 수정</label>
            <input
              type="text"
              className="form-input"
              value={suggestedTitle}
              onChange={(e) => setSuggestedTitle(e.target.value)}
            />
          </div>

          {/* Wordpress Result Alert */}
          {publishResult && (
            <div
              style={{
                background: "rgba(48,209,88,0.1)",
                border: "1px solid #30d158",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <span style={{ fontWeight: "800", color: "#30d158" }}>🎉 워드프레스 임시저장 업로드 완료! (ID: {publishResult.postId})</span>
              {publishResult.editLink && (
                <a
                  href={publishResult.editLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#ffd700", textDecoration: "underline", fontSize: "13px", fontWeight: "700" }}
                >
                  워드프레스에서 글 편집 및 승인하러 가기 🔗
                </a>
              )}
            </div>
          )}

          {/* Markdown Output Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
              <span>마크다운 형식 (blog_post.md)</span>
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(generatedMarkdown)}>
                전체 복사
              </span>
            </div>
            <textarea
              className="form-textarea"
              style={{ height: "300px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}
              readOnly
              value={generatedMarkdown}
            />
          </div>
        </div>
      )}

      {/* 5. SNS Refactored Outputs Display */}
      {loadingRefactor && (
        <div className="card-panel" style={{ textAlign: "center", padding: "30px" }}>
          <div style={{ fontSize: "20px", animation: "spin 1.5s linear infinite", display: "inline-block", marginBottom: "12px" }}>🔄</div>
          <h4 style={{ fontWeight: "800", fontSize: "15px" }}>SNS 맞춤 가공기 구동 중...</h4>
          <p style={{ fontSize: "12px", opacity: 0.7, marginTop: "6px" }}>
            유튜브 쇼츠 대본, 인스타그램 카드뉴스 JSON, 트위터 타래 스레드로 변환하고 있습니다.
          </p>
        </div>
      )}

      {refactorData && (
        <div className="card-panel">
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "16px", color: "#ffd700" }}>
            📱 멀티플랫폼 SNS 2차 저작물 산출
          </h3>
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "16px" }}>
            <button
              onClick={() => setActiveSnsTab("shorts")}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                color: activeSnsTab === "shorts" ? "white" : "rgba(255,255,255,0.5)",
                borderBottom: activeSnsTab === "shorts" ? "2px solid #ff2a5f" : "none",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              쇼츠 대본
            </button>
            <button
              onClick={() => setActiveSnsTab("cards")}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                color: activeSnsTab === "cards" ? "white" : "rgba(255,255,255,0.5)",
                borderBottom: activeSnsTab === "cards" ? "2px solid #ff2a5f" : "none",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              카드뉴스 기획(JSON)
            </button>
            <button
              onClick={() => setActiveSnsTab("x")}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                color: activeSnsTab === "x" ? "white" : "rgba(255,255,255,0.5)",
                borderBottom: activeSnsTab === "x" ? "2px solid #ff2a5f" : "none",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              X 스레드 타래
            </button>
          </div>

          <div>
            {activeSnsTab === "shorts" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>45초 숏폼 비디오용 나레이션 및 화면 구성</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(refactorData.shorts)}>
                    대본 복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "250px", fontSize: "13px", lineHeight: "1.6" }}
                  readOnly
                  value={refactorData.shorts}
                />
              </div>
            )}

            {activeSnsTab === "cards" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>🎨 카드 테마 선택:</span>
                    <button onClick={() => setCardTheme("navy")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#0f172a", color: "#fbbf24", border: cardTheme === "navy" ? "2px solid #fbbf24" : "1px solid #333", fontSize: "12px", cursor: "pointer" }}>Navy (비즈니스)</button>
                    <button onClick={() => setCardTheme("beige")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#fdf8f5", color: "#ff6b35", border: cardTheme === "beige" ? "2px solid #ff6b35" : "1px solid #ddd", fontSize: "12px", cursor: "pointer" }}>Beige (감성)</button>
                    <button onClick={() => setCardTheme("white")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#ffffff", color: "#3498db", border: cardTheme === "white" ? "2px solid #3498db" : "1px solid #ddd", fontSize: "12px", cursor: "pointer" }}>White (심플/IT)</button>
                  </div>
                  <span style={{ cursor: "pointer", textDecoration: "underline", fontSize: "12px", opacity: 0.6 }} onClick={() => copyToClipboard(JSON.stringify(refactorData.cardNews, null, 2))}>
                    JSON 소스 보기
                  </span>
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  {(Array.isArray(refactorData.cardNews) ? refactorData.cardNews : (refactorData.cardNews?.cards || [])).map((card: any, idx: number) => {
                    const theme = getThemeStyles();
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "320px" }}>
                        <div
                          id={`card-slide-${card.slide}`}
                          style={{
                            width: "320px",
                            height: "320px",
                            background: theme.bg,
                            color: theme.text,
                            padding: "30px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            boxSizing: "border-box",
                            position: "relative",
                            overflow: "hidden",
                            fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif"
                          }}
                        >
                          <div style={{ position: "absolute", top: "20px", left: "20px", background: theme.point, color: theme.bg, padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>
                            {card.slide === 1 ? "💡 핵심 꿀팁" : `Slide 0${card.slide}`}
                          </div>
                          <h2 style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.4", wordBreak: "keep-all", marginBottom: "16px", marginTop: "20px" }}>
                            {card.title}
                          </h2>
                          <p style={{ fontSize: "15px", lineHeight: "1.5", opacity: 0.9, wordBreak: "keep-all" }}>
                            {card.body || card.content}
                          </p>
                          <div style={{ position: "absolute", bottom: "20px", right: "20px", fontSize: "11px", opacity: 0.4, fontWeight: "600" }}>
                            @content_factory
                          </div>
                        </div>
                        <button
                          onClick={() => downloadCard(card.slide)}
                          style={{
                            background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "10px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px"
                          }}
                        >
                          ⬇️ 이미지(PNG) 다운로드
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeSnsTab === "x" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>X(트위터) 업로드용 140자 스레드 글 목록</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(refactorData.xThread)}>
                    타래 복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "250px", fontSize: "13px", lineHeight: "1.6" }}
                  readOnly
                  value={refactorData.xThread}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
