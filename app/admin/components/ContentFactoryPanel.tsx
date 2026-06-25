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
  const [wpMarkdown, setWpMarkdown] = useState("");
  const [bloggerMarkdown, setBloggerMarkdown] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState<"wp" | "blogger">("wp");
  const [selectedMainTheme, setSelectedMainTheme] = useState(0);

  // Unified Multi-Draft States
  const [wpKeyword, setWpKeyword] = useState<string | null>(null);
  const [wpTitle, setWpTitle] = useState("");
  const [wpMetaDescription, setWpMetaDescription] = useState("");
  const [bloggerKeyword, setBloggerKeyword] = useState<string | null>(null);
  const [bloggerTitle, setBloggerTitle] = useState("");
  const [bloggerMetaDescription, setBloggerMetaDescription] = useState("");
  const [bloggerHtml, setBloggerHtml] = useState("");

  // 관련 링크 (유튜브/블로그) 첨부
  const [wpRelatedLinks, setWpRelatedLinks] = useState<{ url: string; title: string; type: "youtube" | "blog" }[]>([
    { url: "", title: "", type: "youtube" },
    { url: "", title: "", type: "blog" },
    { url: "", title: "", type: "blog" },
  ]);
  const [bloggerRelatedLinks, setBloggerRelatedLinks] = useState<{ url: string; title: string; type: "youtube" | "blog" }[]>([
    { url: "", title: "", type: "youtube" },
    { url: "", title: "", type: "blog" },
    { url: "", title: "", type: "blog" },
  ]);

  // SNS Refactoring states
  const [loadingRefactor, setLoadingRefactor] = useState(false);
  const [refactorData, setRefactorData] = useState<{
    shorts: string;
    cardNews: any;
    xThread: string;
    bloggerPost?: string;
    snsCaption?: string;
  } | null>(null);
  const [activeSnsTab, setActiveSnsTab] = useState<"shorts" | "cards" | "x" | "blogger" | "facebook_insta">("shorts");
  const [cardTheme, setCardTheme] = useState<"navy" | "beige" | "white">("navy");

  // Publishing states
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    postId: string | null;
    editLink: string | null;
  } | null>(null);
  const [loadingBloggerPublish, setLoadingBloggerPublish] = useState(false);
  const [bloggerPublishResult, setBloggerPublishResult] = useState<{
    postId: string | null;
    editLink: string | null;
  } | null>(null);
  const [loadingN8n, setLoadingN8n] = useState(false);
  const [wpThumbnailBase64, setWpThumbnailBase64] = useState<string | null>(null);
  const [wpContentImageBase64, setWpContentImageBase64] = useState<string | null>(null);
  const [bloggerThumbnailBase64, setBloggerThumbnailBase64] = useState<string | null>(null);
  const [bloggerContentImageBase64, setBloggerContentImageBase64] = useState<string | null>(null);
  const [loadingReels, setLoadingReels] = useState(false);
  const [customCardCoverBase64, setCustomCardCoverBase64] = useState<string | null>(null);

  // AI Illustration-Style Thumbnail Generator States & Config
  const [selectedThumbBg, setSelectedThumbBg] = useState<string>("clay");
  const [generatingThumb, setGeneratingThumb] = useState<boolean>(false);
  const thumbnailBackgrounds = [
    { id: "clay", name: "🎨 클레이 일러스트", url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop" },
    { id: "organic", name: "🌿 감성 드로잉", url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop" },
    { id: "wave", name: "🌊 모던 추상화", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop" },
    { id: "vintage", name: "🖼️ 빈티지 페인팅", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop" },
    { id: "cyber", name: "⚡ 디지털 테크", url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop" },
  ];

  const handleAutoGenerateThumbnail = async () => {
    setGeneratingThumb(true);
    try {
      const elementWp = document.getElementById("auto-thumbnail-canvas-wp");
      const elementBlogger = document.getElementById("auto-thumbnail-canvas-blogger");
      
      if (!elementWp || !elementBlogger) {
        alert("썸네일 생성용 템플릿 요소를 찾을 수 없습니다.");
        return;
      }
      
      // Capture WordPress Thumbnail
      const canvasWp = await html2canvas(elementWp, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      const base64Wp = canvasWp.toDataURL("image/png").split(",")[1];
      setWpThumbnailBase64(base64Wp);
      saveStateToLocalStorage("cf_wpThumbnailBase64", base64Wp);
      
      // Capture Blogger Thumbnail
      const canvasBlogger = await html2canvas(elementBlogger, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      const base64Blogger = canvasBlogger.toDataURL("image/png").split(",")[1];
      setBloggerThumbnailBase64(base64Blogger);
      saveStateToLocalStorage("cf_bloggerThumbnailBase64", base64Blogger);
      
      alert("🎨 워드프레스용과 구글 블로거용 일러스트 썸네일(각각의 제목 반영)이 성공적으로 자동 생성 및 개별 적용되었습니다!");
    } catch (e: any) {
      alert(`썸네일 생성 실패: ${e.message}`);
    } finally {
      setGeneratingThumb(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setBase64: (val: string | null) => void, storageKey: string) => {
    const file = e.target.files?.[0];
    if (!file) {
      setBase64(null);
      saveStateToLocalStorage(storageKey, null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64Data = reader.result.split(',')[1];
        setBase64(base64Data);
        saveStateToLocalStorage(storageKey, base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

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
        "국세환급금 조회 방법", "부동산 취등록세 계산", "양도소득세 면제 조건", "상속세/증여세 절세", "건강보험료 피부양자 자격"
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
  ];  // 🔄 세션 데이터 복원 이펙트 (최초 1회 실행)




  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedQuery = localStorage.getItem("cf_query") || "";
      const savedTrends = localStorage.getItem("cf_trends");
      const savedSelectedKeyword = localStorage.getItem("cf_selectedKeyword");
      const savedSuggestedTitle = localStorage.getItem("cf_suggestedTitle") || "";
      const savedExtraFact = localStorage.getItem("cf_extraFact") || "";
      const savedWpMarkdown = localStorage.getItem("cf_wpMarkdown") || "";
      const savedBloggerMarkdown = localStorage.getItem("cf_bloggerMarkdown") || "";
      const savedPreviewTab = localStorage.getItem("cf_activePreviewTab") as "wp" | "blogger" || "wp";
      const savedRefactorData = localStorage.getItem("cf_refactorData");

      const savedWpKeyword = localStorage.getItem("cf_wpKeyword") || "";
      const savedWpTitle = localStorage.getItem("cf_wpTitle") || "";
      const savedWpMetaDescription = localStorage.getItem("cf_wpMetaDescription") || "";
      const savedBloggerKeyword = localStorage.getItem("cf_bloggerKeyword") || "";
      const savedBloggerTitle = localStorage.getItem("cf_bloggerTitle") || "";
      const savedBloggerMetaDescription = localStorage.getItem("cf_bloggerMetaDescription") || "";
      const savedBloggerHtml = localStorage.getItem("cf_bloggerHtml") || "";
      const savedWpRelatedLinks = localStorage.getItem("cf_wpRelatedLinks");
      const savedBloggerRelatedLinks = localStorage.getItem("cf_bloggerRelatedLinks");

      // Clear image cache from localStorage on reload to prevent old remnants
      localStorage.removeItem("cf_wpThumbnailBase64");
      localStorage.removeItem("cf_wpContentImageBase64");
      localStorage.removeItem("cf_bloggerThumbnailBase64");
      localStorage.removeItem("cf_bloggerContentImageBase64");
      localStorage.removeItem("cf_customCardCoverBase64");

      // Clear image React states
      setWpThumbnailBase64(null);
      setWpContentImageBase64(null);
      setBloggerThumbnailBase64(null);
      setBloggerContentImageBase64(null);
      setCustomCardCoverBase64(null);

      // Restore all text and structured draft inputs
      if (savedQuery) setQuery(savedQuery);
      if (savedTrends) setTrends(JSON.parse(savedTrends));
      if (savedSelectedKeyword) setSelectedKeyword(savedSelectedKeyword);
      if (savedSuggestedTitle) setSuggestedTitle(savedSuggestedTitle);
      if (savedExtraFact) setExtraFact(savedExtraFact);
      if (savedWpMarkdown) setWpMarkdown(savedWpMarkdown);
      if (savedBloggerMarkdown) setBloggerMarkdown(savedBloggerMarkdown);
      if (savedPreviewTab) setActivePreviewTab(savedPreviewTab);
      if (savedRefactorData) setRefactorData(JSON.parse(savedRefactorData));

      setWpKeyword(savedWpKeyword || null);
      setWpTitle(savedWpTitle);
      if (savedWpMetaDescription) setWpMetaDescription(savedWpMetaDescription);
      setBloggerKeyword(savedBloggerKeyword || null);
      setBloggerTitle(savedBloggerTitle);
      if (savedBloggerMetaDescription) setBloggerMetaDescription(savedBloggerMetaDescription);
      setBloggerHtml(savedBloggerHtml);
      if (savedWpRelatedLinks) {
        try { setWpRelatedLinks(JSON.parse(savedWpRelatedLinks)); } catch(e) {}
      }
      if (savedBloggerRelatedLinks) {
        try { setBloggerRelatedLinks(JSON.parse(savedBloggerRelatedLinks)); } catch(e) {}
      }
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
      setWpMarkdown("");
      setBloggerMarkdown("");
      setActivePreviewTab("wp");
      setExtraFact("");
      setRefactorData(null);
      setPublishResult(null);
      setBloggerPublishResult(null);
      setCustomCardCoverBase64(null);
      
      setWpKeyword(null);
      setWpTitle("");
      setWpMetaDescription("");
      setBloggerKeyword(null);
      setBloggerTitle("");
      setBloggerMetaDescription("");
      setBloggerHtml("");
      const defaultLinks = [{ url: "", title: "", type: "youtube" as const }, { url: "", title: "", type: "blog" as const }, { url: "", title: "", type: "blog" as const }];
      setWpRelatedLinks([...defaultLinks]);
      setBloggerRelatedLinks([...defaultLinks]);

      setWpThumbnailBase64(null);
      setWpContentImageBase64(null);
      setBloggerThumbnailBase64(null);
      setBloggerContentImageBase64(null);
      saveStateToLocalStorage("cf_wpThumbnailBase64", null);
      saveStateToLocalStorage("cf_wpContentImageBase64", null);
      saveStateToLocalStorage("cf_bloggerThumbnailBase64", null);
      saveStateToLocalStorage("cf_bloggerContentImageBase64", null);

      const keys = [
        "cf_query", "cf_trends", "cf_selectedKeyword", "cf_suggestedTitle", "cf_extraFact", 
        "cf_wpMarkdown", "cf_bloggerMarkdown", "cf_activePreviewTab", "cf_refactorData", "cf_customCardCoverBase64",
        "cf_wpKeyword", "cf_wpTitle", "cf_wpMetaDescription", "cf_bloggerKeyword", "cf_bloggerTitle", "cf_bloggerMetaDescription", "cf_bloggerHtml",
        "cf_wpThumbnailBase64", "cf_wpContentImageBase64", "cf_bloggerThumbnailBase64", "cf_bloggerContentImageBase64",
        "cf_wpRelatedLinks", "cf_bloggerRelatedLinks"
      ];
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
    setWpMarkdown("");
    setBloggerMarkdown("");
    setSelectedKeyword(null);
    setSuggestedTitle("");
    setRefactorData(null);
    setPublishResult(null);

    // 검색 실행 전 쿼리 선행 저장
    saveStateToLocalStorage("cf_query", searchQuery);
    saveStateToLocalStorage("cf_trends", null);
    saveStateToLocalStorage("cf_selectedKeyword", null);
    saveStateToLocalStorage("cf_suggestedTitle", null);
    saveStateToLocalStorage("cf_wpMarkdown", null);
    saveStateToLocalStorage("cf_bloggerMarkdown", null);
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
  const handleGenerate = async (keyword: string, titleSuggestion: string, topRankPostSummary?: string, comboType: "wordpress" | "blogger" = "wordpress") => {
    setSelectedKeyword(keyword);
    setSuggestedTitle(titleSuggestion);
    setLoadingGenerate(true);
    
    if (comboType === "wordpress") {
      setWpKeyword(keyword);
      setWpTitle(titleSuggestion);
      setWpMarkdown("");
      setWpThumbnailBase64(null);
      setWpContentImageBase64(null);
      saveStateToLocalStorage("cf_wpKeyword", keyword);
      saveStateToLocalStorage("cf_wpTitle", titleSuggestion);
      saveStateToLocalStorage("cf_wpMarkdown", null);
      saveStateToLocalStorage("cf_wpThumbnailBase64", null);
      saveStateToLocalStorage("cf_wpContentImageBase64", null);
      setPublishResult(null);
    } else {
      setBloggerKeyword(keyword);
      setBloggerTitle(titleSuggestion);
      setBloggerMarkdown("");
      setBloggerThumbnailBase64(null);
      setBloggerContentImageBase64(null);
      saveStateToLocalStorage("cf_bloggerKeyword", keyword);
      saveStateToLocalStorage("cf_bloggerTitle", titleSuggestion);
      saveStateToLocalStorage("cf_bloggerMarkdown", null);
      saveStateToLocalStorage("cf_bloggerThumbnailBase64", null);
      saveStateToLocalStorage("cf_bloggerContentImageBase64", null);
      setBloggerPublishResult(null);
    }
    
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
        body: JSON.stringify({ action: "generate", keyword, title: titleSuggestion, extraFact, topRankPostSummary })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`서버 응답 오류 (상태: ${res.status}): ${text.substring(0, 100)}...`);
      }

      if (res.ok && data?.markdown) {
        if (comboType === "wordpress") {
          setWpMarkdown(data.markdown);
          saveStateToLocalStorage("cf_wpMarkdown", data.markdown);
          setActivePreviewTab("wp");
          saveStateToLocalStorage("cf_activePreviewTab", "wp");
          // 메타설명 자동 채우기 (seo_meta에서 반환된 경우)
          if (data.metaDescription) {
            setWpMetaDescription(data.metaDescription);
            saveStateToLocalStorage("cf_wpMetaDescription", data.metaDescription);
          }
        } else {
          setBloggerMarkdown(data.markdown);
          setBloggerHtml(data.markdown); // fallback initial HTML to markdown
          saveStateToLocalStorage("cf_bloggerMarkdown", data.markdown);
          saveStateToLocalStorage("cf_bloggerHtml", data.markdown);
          setActivePreviewTab("blogger");
          saveStateToLocalStorage("cf_activePreviewTab", "blogger");
          if (data.metaDescription) {
            setBloggerMetaDescription(data.metaDescription);
            saveStateToLocalStorage("cf_bloggerMetaDescription", data.metaDescription);
          }
        }
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
    // We prioritize using the WordPress keyword for refactoring since the spin post is generated based on the WP post
    const refactorKeyword = wpKeyword || selectedKeyword;
    if (!refactorKeyword) {
      alert("재가공을 실행할 대상 키워드(초안)가 존재하지 않습니다.");
      return;
    }
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
        body: JSON.stringify({ action: "refactor", keyword: refactorKeyword })
      });
      const data = await res.json();
      if (res.ok) {
        const refObj = {
          shorts: data.shorts,
          cardNews: data.cardNews,
          xThread: data.xThread,
          bloggerPost: data.bloggerPost,
          snsCaption: data.snsCaption
        };
        setRefactorData(refObj);
        saveStateToLocalStorage("cf_refactorData", refObj);
        
        // Do not overwrite bloggerHtml with the short spun post summary

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
    const targetKeyword = wpKeyword || selectedKeyword;
    const targetTitle = wpTitle || suggestedTitle;
    if (!targetKeyword) {
      alert("발행할 대상 키워드(초안)가 존재하지 않습니다.");
      return;
    }
    setLoadingPublish(true);
    setPublishResult(null);

    // 메타설명 길이 검증
    if (wpMetaDescription.length < 60 || wpMetaDescription.length > 110) {
      alert(`⚠️ 워드프레스 메타 설명은 60~110자 사이여야 합니다.\n현재: ${wpMetaDescription.length}자`);
      setLoadingPublish(false);
      return;
    }

    // 관련 링크를 마크다운 끝에 삽입
    const validWpLinks = wpRelatedLinks.filter(l => l.url.trim());
    let finalWpMarkdown = wpMarkdown;
    if (validWpLinks.length > 0) {
      const linksSection = buildRelatedLinksSection(validWpLinks);
      finalWpMarkdown = finalWpMarkdown.trimEnd() + "\n\n" + linksSection;
    }

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ 
          action: "publish", 
          keyword: targetKeyword, 
          title: targetTitle,
          metaDescription: wpMetaDescription,
          wpThumbnailBase64, 
          wpContentImageBase64, 
          generatedMarkdown: finalWpMarkdown
        })
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

  // Action 4.5: Publish to Google Blogger
  const handleBloggerPublish = async () => {
    const targetKeyword = bloggerKeyword || selectedKeyword;
    const targetTitle = bloggerTitle || suggestedTitle;
    if (!targetKeyword) {
      alert("구글 블로그에 발행할 대상 키워드(초안)가 존재하지 않습니다.");
      return;
    }
    setLoadingBloggerPublish(true);
    setBloggerPublishResult(null);

    // 메타설명 길이 검증
    if (bloggerMetaDescription.length < 60 || bloggerMetaDescription.length > 110) {
      alert(`⚠️ 구글 블로거 메타 설명은 60~110자 사이여야 합니다.\n현재: ${bloggerMetaDescription.length}자`);
      setLoadingBloggerPublish(false);
      return;
    }

    // 관련 링크를 HTML 끝에 삽입
    const validBloggerLinks = bloggerRelatedLinks.filter(l => l.url.trim());
    let finalBloggerHtml = bloggerHtml;
    if (validBloggerLinks.length > 0) {
      const linksHtml = buildRelatedLinksHtml(validBloggerLinks);
      finalBloggerHtml = finalBloggerHtml.trimEnd() + "\n" + linksHtml;
    }

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ 
          action: "publish-blogger", 
          keyword: targetKeyword, 
          title: targetTitle,
          metaDescription: bloggerMetaDescription,
          bloggerThumbnailBase64, 
          bloggerContentImageBase64, 
          bloggerPost: finalBloggerHtml
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setBloggerPublishResult({
          postId: data.postId,
          editLink: data.editLink
        });
        alert("구글 블로그 임시저장 발행이 완료되었습니다!");
      } else {
        alert(`구글 블로그 발행 실패: ${data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingBloggerPublish(false);
    }
  };

  // Action 5: Send to n8n Webhook
  const handleSendToN8n = async () => {
    const targetWpKeyword = wpKeyword || selectedKeyword;
    const targetBloggerKeyword = bloggerKeyword || selectedKeyword;
    if (!targetWpKeyword) {
      alert("전송할 대상 키워드(초안)가 존재하지 않습니다.");
      return;
    }
    setLoadingN8n(true);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ 
          action: "n8n", 
          
          wpKeyword: targetWpKeyword,
          wpTitle: wpTitle || suggestedTitle,
          wpContent: wpMarkdown,
          
          bloggerKeyword: targetBloggerKeyword,
          bloggerTitle: bloggerTitle || suggestedTitle,
          bloggerPost: bloggerHtml,
          
          bloggerThumbnailBase64,
          bloggerContentImageBase64,
          
          snsCaption: refactorData?.snsCaption,
          reelsVideoUrl: null
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        alert("n8n 자동화 워크플로우 전송 성공! n8n을 확인해 보세요.");
      } else {
        alert(`n8n 전송 실패: ${data?.details || data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`er: ${e.message}`);
    } finally {
      setLoadingN8n(false);
    }
  };

  const handleCreateReels = async () => {
    const cards = Array.isArray(refactorData?.cardNews)
      ? refactorData.cardNews
      : (refactorData?.cardNews?.cards || []);

    if (cards.length === 0 || !selectedKeyword) {
      alert("영상으로 만들 카드 데이터가 없습니다.");
      return;
    }

    setLoadingReels(true);

    try {
      const slidesBase64: string[] = [];

      // 1. 모든 카드 슬라이드를 html2canvas로 캡처하여 Base64 획득
      for (const card of cards) {
        const element = document.getElementById(`card-slide-${card.slide}`);
        if (!element) {
          throw new Error(`슬라이드 ${card.slide} 요소를 찾을 수 없습니다.`);
        }
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const base64Data = canvas.toDataURL("image/png").split(",")[1];
        slidesBase64.push(base64Data);
      }

      // 2. 백엔드 동영상 제작 API 호출
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          action: "create-video",
          keyword: selectedKeyword,
          slides: slidesBase64
        })
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        alert("🎉 FFmpeg 릴스 동영상 생성 성공! 로컬 output 폴더에 'reels_shorts.mp4' 파일이 생성되었습니다.");
      } else {
        alert(`동영상 제작 실패: ${data?.details || data?.error || "unknown"}`);
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`);
    } finally {
      setLoadingReels(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다!");
  };

  // 관련 링크 헬퍼 함수
  const buildRelatedLinksSection = (links: { url: string; title: string; type: string }[]) => {
    const items = links
      .filter(l => l.url.trim())
      .map(l => {
        const label = l.title.trim() || l.url;
        const icon = l.type === "youtube" ? "📺" : "📝";
        return `- ${icon} [${label}](${l.url.trim()})`;
      })
      .join("\n");
    return `---\n\n## 🔗 관련 참고 링크\n\n${items}`;
  };

  const buildRelatedLinksHtml = (links: { url: string; title: string; type: string }[]) => {
    const items = links
      .filter(l => l.url.trim())
      .map(l => {
        const label = l.title.trim() || l.url;
        const icon = l.type === "youtube" ? "📺" : "📝";
        const isYoutube = l.type === "youtube";
        const linkColor = isYoutube ? "#ff0000" : "#0070f3";
        return `<li style="margin-bottom:10px; padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:8px; border-left:3px solid ${linkColor};"><a href="${l.url.trim()}" target="_blank" rel="noopener noreferrer" style="color:${linkColor}; text-decoration:none; font-weight:700; font-size:14px;">${icon} ${label}</a><br><span style="font-size:12px; color:#888;">${l.url.trim()}</span></li>`;
      })
      .join("\n");
    return `<hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:32px 0;">\n<div style="margin:24px 0; padding:20px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.08);">\n<h3 style="font-size:16px; font-weight:800; margin:0 0 16px; color:#ffd700;">🔗 관련 참고 링크</h3>\n<ul style="list-style:none; padding:0; margin:0;">\n${items}\n</ul>\n</div>`;
  };

  // 메타설명 글자 수에 따른 색상
  const getMetaDescColor = (len: number) => {
    if (len === 0) return "rgba(255,255,255,0.3)";
    if (len < 60) return "#ff9f0a";
    if (len <= 110) return "#30d158";
    return "#ff453a";
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

  const downloadAllCards = async () => {
    const cards = Array.isArray(refactorData?.cardNews)
      ? refactorData.cardNews
      : (refactorData?.cardNews?.cards || []);
    
    if (cards.length === 0) {
      alert("다운로드할 카드 데이터가 없습니다.");
      return;
    }
    
    for (const card of cards) {
      await downloadCard(card.slide);
      // 브라우저 동시 다운로드 누락 방지 및 딜레이
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  };

  const getThemeStyles = () => {
    switch(cardTheme) {
      case "beige": 
        return { 
          bg: "linear-gradient(135deg, #fdf8f5 0%, #f7ebe1 100%)", 
          text: "#4a3b32", 
          point: "#ff6b35",
          cardBg: "rgba(255, 255, 255, 0.55)",
          cardBorder: "rgba(255, 107, 53, 0.15)",
          sub: "rgba(74, 59, 50, 0.7)"
        };
      case "white": 
        return { 
          bg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", 
          text: "#0f172a", 
          point: "#3498db",
          cardBg: "rgba(241, 245, 249, 0.8)",
          cardBorder: "rgba(52, 152, 219, 0.15)",
          sub: "rgba(15, 23, 42, 0.65)"
        };
      case "navy": 
      default: 
        return { 
          bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
          text: "#f8fafc", 
          point: "#fbbf24",
          cardBg: "rgba(255, 255, 255, 0.04)",
          cardBorder: "rgba(255, 255, 255, 0.08)",
          sub: "rgba(248, 250, 252, 0.65)"
        };
    }
  };

  const renderHighlightedTitle = (title: string, keyword: string | null) => {
    if (!title) return "";
    if (!keyword) return title;
    
    // Split keyphrase into individual words and filter out short ones
    const keywords = keyword
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9가-힣]/g, "").trim())
      .filter(w => w.length >= 2);
      
    if (keywords.length === 0) {
      return title;
    }
    
    // Create safe search regex for any of the keywords
    const escapedKeywords = keywords.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedKeywords.join("|")})`, "gi");
    const parts = title.split(regex);
    
    return parts.map((part, index) => {
      const isMatch = keywords.some(w => w.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <span key={index} style={{ color: "#ffd700", fontWeight: "900", borderBottom: "3px solid #ffd700", paddingBottom: "2px", margin: "0 2px", display: "inline-block" }}>
            {part}
          </span>
        );
      }
      return part;
    });
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginTop: "10px" }}>
              {googleTrends.map((t, idx) => {
                const isHigh = t.profit_rating === "High";
                const isMed = t.profit_rating === "Medium";
                const badgeBg = isHigh ? "rgba(255, 69, 58, 0.15)" : isMed ? "rgba(255, 159, 10, 0.15)" : "rgba(142, 142, 147, 0.15)";
                const badgeBorder = isHigh ? "#ff453a" : isMed ? "#ff9f0a" : "#8e8e93";
                const badgeText = isHigh ? "🔥 고수익 추천" : isMed ? "⚡ 일반 트래픽" : "❄️ 낮은 수익성";
                const badgeColor = isHigh ? "#ff453a" : isMed ? "#ff9f0a" : "#8e8e93";

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setQuery(t.keyword);
                      saveStateToLocalStorage("cf_query", t.keyword);
                      handleSearch(t.keyword);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "10px",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.3)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700" }}>#{t.keyword}</span>
                      <span style={{ fontSize: "10px", background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor, padding: "2px 6px", borderRadius: "20px", fontWeight: "bold" }}>
                        {badgeText}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.5 }}>검색 트래픽: {t.traffic}</div>
                    {t.profit_reason && (
                      <div style={{ fontSize: "11px", color: "#eaeaea" }}>
                        <strong>이유:</strong> {t.profit_reason}
                      </div>
                    )}
                    {t.monetization_angle && (
                      <div style={{ fontSize: "11px", color: "#a1a1a6", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px" }}>
                        <strong>추천 기획:</strong> {t.monetization_angle}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "10px" }}>우측 갱신 버튼을 눌러 실시간 화두를 확인해 보세요!</p>
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
                  background: item.combo_type === "wordpress" ? "rgba(48, 209, 88, 0.03)" : "rgba(88, 86, 214, 0.03)",
                  border: `1px solid ${item.combo_type === "wordpress" ? "rgba(48, 209, 88, 0.15)" : "rgba(88, 86, 214, 0.15)"}`,
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <span style={{
                      fontSize: "10px",
                      background: item.combo_type === "wordpress" ? "#30d158" : "#5856d6",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      marginRight: "8px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      verticalAlign: "middle"
                    }}>
                      {item.combo_type === "wordpress" ? "WP용 조합" : "Blogger용 조합"}
                    </span>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#ffd700", verticalAlign: "middle" }}>{item.keyword}</span>
                    <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 6px", marginLeft: "8px", verticalAlign: "middle" }}>
                      {item.intent}
                    </span>
                  </div>
                  <button
                    className="btn-submit"
                    style={{
                      width: "130px",
                      height: "32px",
                      fontSize: "12px",
                      borderRadius: "8px",
                      background: item.combo_type === "wordpress" ? "linear-gradient(135deg, #30d158 0%, #10b981 100%)" : "linear-gradient(135deg, #5856d6 0%, #4338ca 100%)"
                    }}
                    onClick={() => handleGenerate(item.keyword, item.suggested_title, item.top_rank_post_summary, item.combo_type)}
                    disabled={loadingGenerate}
                  >
                    {item.combo_type === "wordpress" ? "WP 초안 작성" : "Blogger 초안 작성"}
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
                {item.top_rank_post_summary && (
                  <div style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                    background: "rgba(0,0,0,0.2)",
                    padding: "10px",
                    borderRadius: "6px",
                    marginTop: "4px",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    <strong style={{ color: "#ffd700", display: "block", marginBottom: "4px" }}>🔍 최상단 노출 원본 블로그 참고/가공 요약:</strong>
                    <div style={{ maxHeight: "80px", overflowY: "auto", whiteSpace: "pre-wrap", fontStyle: "italic", fontSize: "11px", lineHeight: "1.5" }}>
                      {item.top_rank_post_summary}
                    </div>
                  </div>
                )}
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
      {(wpMarkdown || bloggerMarkdown || bloggerHtml) && (
        <div className="card-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#ffd700", margin: 0 }}>
                📝 생성 완료: 블로그 포스트 초안 검토 및 편집
              </h3>
              <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px", marginBottom: 0 }}>
                워드프레스와 구글 블로그 초안을 각각 편집하고 개별 발행하거나, n8n으로 한 번에 보낼 수 있습니다.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-submit"
                style={{ width: "130px", height: "36px", fontSize: "12px", borderRadius: "8px", background: "linear-gradient(135deg, #ff9f0a 0%, #ff7f00 100%)" }}
                onClick={handleRefactor}
                disabled={loadingRefactor}
              >
                {loadingRefactor ? "SNS 가공 중..." : "SNS 멀티채널 가공 📱"}
              </button>
              <button
                className="btn-submit"
                style={{ width: "140px", height: "36px", fontSize: "12px", borderRadius: "8px", background: "linear-gradient(135deg, #ffd700 0%, #ffa500 100%)", color: "#000", fontWeight: "800" }}
                onClick={handleSendToN8n}
                disabled={loadingN8n}
              >
                {loadingN8n ? "n8n 전송 중..." : "n8n 자동화 전송 ⚡"}
              </button>
            </div>
          </div>

          {/* 🎨 AI 일러스트 썸네일 카드 제작기 */}
          <div style={{ 
            background: "rgba(255, 255, 255, 0.02)", 
            border: "1px solid rgba(255, 215, 0, 0.15)", 
            borderRadius: "12px", 
            padding: "16px", 
            marginBottom: "24px" 
          }}>
            <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#ffd700", marginBottom: "8px", marginTop: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🎨</span> AI 일러스트 카드형 썸네일 자동 메이커
            </h4>
            <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px", marginTop: 0 }}>
              AI가 추천한 제목을 바탕으로 그림처럼 세련된 대표 카드 이미지를 자동 생성하고 워드프레스/블로거 썸네일에 동시 적용합니다.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#d1d1d6", fontWeight: "700" }}>일러스트 화풍 선택:</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {thumbnailBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedThumbBg(bg.id)}
                    style={{
                      padding: "6px 12px",
                      background: selectedThumbBg === bg.id ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${selectedThumbBg === bg.id ? "#ffd700" : "rgba(255, 255, 255, 0.1)"}`,
                      borderRadius: "6px",
                      color: selectedThumbBg === bg.id ? "#ffd700" : "#d1d1d6",
                      fontSize: "12px",
                      fontWeight: selectedThumbBg === bg.id ? "bold" : "normal",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAutoGenerateThumbnail}
                disabled={generatingThumb}
                style={{
                  marginLeft: "auto",
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #ffd700 0%, #ff9f0a 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#000",
                  fontWeight: "800",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                {generatingThumb ? "⚙️ 생성 중..." : "🪄 일러스트 썸네일 만들기"}
              </button>
            </div>
          </div>

          {/* Hidden Canvases for html2canvas to capture */}
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
            {/* WordPress Canvas */}
            <div
              id="auto-thumbnail-canvas-wp"
              style={{
                width: "800px",
                height: "450px",
                backgroundImage: `url(${thumbnailBackgrounds.find(b => b.id === selectedThumbBg)?.url || thumbnailBackgrounds[0].url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "45px 50px",
                boxSizing: "border-box",
                position: "relative",
                fontFamily: "'Pretendard', sans-serif",
                color: "#ffffff"
              }}
            >
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                zIndex: 1
              }} />

              <div style={{ zIndex: 2, display: "flex", alignItems: "center" }}>
                <span style={{
                  backgroundColor: "#30d158",
                  color: "#0f172a",
                  fontSize: "13px",
                  fontWeight: "900",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  letterSpacing: "1.5px",
                  boxShadow: "0 4px 12px rgba(48, 209, 88, 0.3)"
                }}>
                  {wpKeyword || selectedKeyword || "WP REPORT"}
                </span>
              </div>

              <div style={{
                zIndex: 2,
                backgroundColor: "rgba(10, 15, 30, 0.94)",
                border: "2px solid rgba(255, 215, 0, 0.45)",
                borderRadius: "16px",
                padding: "26px 32px",
                margin: "10px 0",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)"
              }}>
                <h1 style={{
                  fontSize: "42px",
                  fontWeight: "900",
                  lineHeight: "1.4",
                  margin: 0,
                  color: "#ffffff",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.6)",
                  wordBreak: "keep-all"
                }}>
                  {renderHighlightedTitle(wpTitle || suggestedTitle || "무림북 블로그 추천 가이드", wpKeyword || selectedKeyword)}
                </h1>
              </div>

              <div style={{
                zIndex: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                paddingTop: "15px"
              }} >
                <span style={{ fontSize: "14px", fontWeight: "700", opacity: 0.8, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  💡 똑똑한 지출 & 재테크 가이드
                </span>
                <span style={{ fontSize: "14px", fontWeight: "900", color: "#ffd700", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  murimbook.com
                </span>
              </div>
            </div>

            {/* Blogger Canvas */}
            <div
              id="auto-thumbnail-canvas-blogger"
              style={{
                width: "800px",
                height: "450px",
                backgroundImage: `url(${thumbnailBackgrounds.find(b => b.id === selectedThumbBg)?.url || thumbnailBackgrounds[0].url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "45px 50px",
                boxSizing: "border-box",
                position: "relative",
                fontFamily: "'Pretendard', sans-serif",
                color: "#ffffff"
              }}
            >
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                zIndex: 1
              }} />

              <div style={{ zIndex: 2, display: "flex", alignItems: "center" }}>
                <span style={{
                  backgroundColor: "#5856d6",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "900",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  letterSpacing: "1.5px",
                  boxShadow: "0 4px 12px rgba(88, 86, 214, 0.3)"
                }}>
                  {bloggerKeyword || selectedKeyword || "BLOGGER REPORT"}
                </span>
              </div>

              <div style={{
                zIndex: 2,
                backgroundColor: "rgba(10, 15, 30, 0.94)",
                border: "2px solid rgba(255, 215, 0, 0.45)",
                borderRadius: "16px",
                padding: "26px 32px",
                margin: "10px 0",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)"
              }}>
                <h1 style={{
                  fontSize: "42px",
                  fontWeight: "900",
                  lineHeight: "1.4",
                  margin: 0,
                  color: "#ffffff",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.6)",
                  wordBreak: "keep-all"
                }}>
                  {renderHighlightedTitle(bloggerTitle || suggestedTitle || "구글 블로그 정보 가이드", bloggerKeyword || selectedKeyword)}
                </h1>
              </div>

              <div style={{
                zIndex: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                paddingTop: "15px"
              }} >
                <span style={{ fontSize: "14px", fontWeight: "700", opacity: 0.8, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  💡 똑똑한 지출 & 재테크 가이드
                </span>
                <span style={{ fontSize: "14px", fontWeight: "900", color: "#ffd700", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  murimbook.com
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px" }}>
            
            {/* WordPress Draft Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(48, 209, 88, 0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "800", color: "#30d158" }}>🟢 워드프레스 초안 (WP Draft)</span>
                {wpKeyword && (
                  <span style={{ fontSize: "11px", background: "rgba(48, 209, 88, 0.1)", color: "#30d158", padding: "2px 6px", borderRadius: "4px" }}>
                    키워드: {wpKeyword}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: "6px" }}>게시글 제목 수정</label>
                <input
                  type="text"
                  className="form-input"
                  value={wpTitle}
                  onChange={(e) => {
                    setWpTitle(e.target.value);
                    saveStateToLocalStorage("cf_wpTitle", e.target.value);
                  }}
                  placeholder="워드프레스 제목을 입력하세요"
                />
              </div>

              {/* ✅ 메타 설명 (필수) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    🔍 메타 설명 <span style={{ color: "#ff453a", fontSize: "11px" }}>* 필수 (60~110자)</span>
                  </label>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: getMetaDescColor(wpMetaDescription.length),
                    transition: "color 0.2s"
                  }}>
                    {wpMetaDescription.length} / 110자
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{
                    height: "72px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    resize: "vertical",
                    border: `1px solid ${wpMetaDescription.length >= 60 && wpMetaDescription.length <= 110 ? "rgba(48,209,88,0.5)" : wpMetaDescription.length > 0 ? "rgba(255,159,10,0.5)" : "rgba(255,255,255,0.12)"}`,
                    transition: "border-color 0.2s"
                  }}
                  value={wpMetaDescription}
                  onChange={(e) => {
                    setWpMetaDescription(e.target.value);
                    saveStateToLocalStorage("cf_wpMetaDescription", e.target.value);
                  }}
                  placeholder="검색 결과에 표시될 설명 (60~110자). 예: '2026년 최신 청년도약계좌 가입 조건부터 혜택까지 A to Z 완벽 정리. 신청 방법과 주의사항도 한 번에 확인하세요.'"
                  maxLength={120}
                />
                {wpMetaDescription.length > 0 && wpMetaDescription.length < 60 && (
                  <p style={{ fontSize: "11px", color: "#ff9f0a", margin: 0 }}>⚠️ 최소 {60 - wpMetaDescription.length}자 더 입력해주세요</p>
                )}
                {wpMetaDescription.length > 110 && (
                  <p style={{ fontSize: "11px", color: "#ff453a", margin: 0 }}>⚠️ {wpMetaDescription.length - 110}자 초과 – 줄여주세요</p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>본문 내용 (마크다운 형식)</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(wpMarkdown)}>
                    복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "350px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}
                  value={wpMarkdown}
                  onChange={(e) => {
                    setWpMarkdown(e.target.value);
                    saveStateToLocalStorage("cf_wpMarkdown", e.target.value);
                  }}
                  placeholder="수정할 워드프레스 본문 마크다운 내용..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label className="form-label" style={{ marginBottom: "4px", fontSize: "11px", display: "block" }}>🖼️ 썸네일 (대표 이미지)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, setWpThumbnailBase64, "cf_wpThumbnailBase64")}
                    style={{ fontSize: "11px", color: "white", width: "100%" }}
                  />
                  {wpThumbnailBase64 && (
                    <img 
                      src={`data:image/png;base64,${wpThumbnailBase64}`} 
                      alt="wp_thumb_preview" 
                      style={{ marginTop: "8px", width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }} 
                    />
                  )}
                </div>
                
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label className="form-label" style={{ marginBottom: "4px", fontSize: "11px", display: "block" }}>📊 본문 내 삽입 이미지</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, setWpContentImageBase64, "cf_wpContentImageBase64")}
                    style={{ fontSize: "11px", color: "white", width: "100%" }}
                  />
                  {wpContentImageBase64 && (
                    <img 
                      src={`data:image/png;base64,${wpContentImageBase64}`} 
                      alt="wp_content_preview" 
                      style={{ marginTop: "8px", width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }} 
                    />
                  )}
                </div>
              </div>

              {publishResult && (
                <div style={{ background: "rgba(48,209,88,0.1)", border: "1px solid #30d158", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: "800", color: "#30d158", fontSize: "12px" }}>🎉 워드프레스 임시저장 업로드 완료!</span>
                  {publishResult.editLink && (
                    <a href={publishResult.editLink} target="_blank" rel="noreferrer" style={{ color: "#ffd700", textDecoration: "underline", fontSize: "12px", fontWeight: "700" }}>
                      글 편집 및 승인하러 가기 🔗
                    </a>
                  )}
                </div>
              )}

              {/* ✅ 관련 링크 첨부 (글 끝 삽입) */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,215,0,0.2)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#ffd700" }}>🔗 관련 참고 링크 첨부 (글 끝에 자동 삽입)</span>
                  <span style={{ fontSize: "11px", opacity: 0.5 }}>유튜브/블로그 최대 3개</span>
                </div>
                {wpRelatedLinks.map((link, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={link.type}
                      onChange={(e) => {
                        const updated = wpRelatedLinks.map((l, i) => i === idx ? { ...l, type: e.target.value as "youtube" | "blog" } : l);
                        setWpRelatedLinks(updated);
                        saveStateToLocalStorage("cf_wpRelatedLinks", updated);
                      }}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", flexShrink: 0, cursor: "pointer", colorScheme: "dark" }}
                    >
                      <option value="youtube">📺 유튜브</option>
                      <option value="blog">📝 블로그</option>
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, height: "34px", fontSize: "12px", padding: "6px 10px" }}
                      placeholder={link.type === "youtube" ? "https://youtu.be/..." : "https://blog.naver.com/..."}
                      value={link.url}
                      onChange={(e) => {
                        const updated = wpRelatedLinks.map((l, i) => i === idx ? { ...l, url: e.target.value } : l);
                        setWpRelatedLinks(updated);
                        saveStateToLocalStorage("cf_wpRelatedLinks", updated);
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: "140px", flexShrink: 0, height: "34px", fontSize: "12px", padding: "6px 10px" }}
                      placeholder="링크 제목 (선택)"
                      value={link.title}
                      onChange={(e) => {
                        const updated = wpRelatedLinks.map((l, i) => i === idx ? { ...l, title: e.target.value } : l);
                        setWpRelatedLinks(updated);
                        saveStateToLocalStorage("cf_wpRelatedLinks", updated);
                      }}
                    />
                  </div>
                ))}
                {wpRelatedLinks.some(l => l.url.trim()) && (
                  <div style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.1)", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                    💡 미리보기: 총 {wpRelatedLinks.filter(l => l.url.trim()).length}개 링크가 글 끝에 '관련 참고 링크' 섹션으로 삽입됩니다.
                  </div>
                )}
              </div>

              <button
                className="btn-submit"
                style={{ width: "100%", height: "38px", fontSize: "13px", borderRadius: "8px", background: "linear-gradient(135deg, #30d158 0%, #10b981 100%)", fontWeight: "bold", opacity: (wpMetaDescription.length >= 60 && wpMetaDescription.length <= 110) ? 1 : 0.6 }}
                onClick={handlePublish}
                disabled={loadingPublish}
              >
                {loadingPublish ? "워드프레스 발행 중..." : "워드프레스 발행 🚀"}
              </button>
            </div>

            {/* Blogger Draft Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(88, 86, 214, 0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "800", color: "#5856d6" }}>🔵 구글 블로거 초안 (Blogger Draft)</span>
                {bloggerKeyword && (
                  <span style={{ fontSize: "11px", background: "rgba(88, 86, 214, 0.1)", color: "#5856d6", padding: "2px 6px", borderRadius: "4px" }}>
                    키워드: {bloggerKeyword}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: "6px" }}>게시글 제목 수정</label>
                <input
                  type="text"
                  className="form-input"
                  value={bloggerTitle}
                  onChange={(e) => {
                    setBloggerTitle(e.target.value);
                    saveStateToLocalStorage("cf_bloggerTitle", e.target.value);
                  }}
                  placeholder="블로거 제목을 입력하세요"
                />
              </div>

              {/* ✅ 메타 설명 (필수) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    🔍 메타 설명 <span style={{ color: "#ff453a", fontSize: "11px" }}>* 필수 (60~110자)</span>
                  </label>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: getMetaDescColor(bloggerMetaDescription.length),
                    transition: "color 0.2s"
                  }}>
                    {bloggerMetaDescription.length} / 110자
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{
                    height: "72px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    resize: "vertical",
                    border: `1px solid ${bloggerMetaDescription.length >= 60 && bloggerMetaDescription.length <= 110 ? "rgba(88,86,214,0.6)" : bloggerMetaDescription.length > 0 ? "rgba(255,159,10,0.5)" : "rgba(255,255,255,0.12)"}`,
                    transition: "border-color 0.2s"
                  }}
                  value={bloggerMetaDescription}
                  onChange={(e) => {
                    setBloggerMetaDescription(e.target.value);
                    saveStateToLocalStorage("cf_bloggerMetaDescription", e.target.value);
                  }}
                  placeholder="검색 결과에 표시될 설명 (60~110자). 예: '2026년 최신 청년도약계좌 가입 조건부터 혜택까지 A to Z 완벽 정리. 신청 방법과 주의사항도 한 번에 확인하세요.'"
                  maxLength={120}
                />
                {bloggerMetaDescription.length > 0 && bloggerMetaDescription.length < 60 && (
                  <p style={{ fontSize: "11px", color: "#ff9f0a", margin: 0 }}>⚠️ 최소 {60 - bloggerMetaDescription.length}자 더 입력해주세요</p>
                )}
                {bloggerMetaDescription.length > 110 && (
                  <p style={{ fontSize: "11px", color: "#ff453a", margin: 0 }}>⚠️ {bloggerMetaDescription.length - 110}자 초과 – 줄여주세요</p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>본문 내용 (HTML/스핀 원고 형식)</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(bloggerHtml)}>
                    복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "350px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}
                  value={bloggerHtml}
                  onChange={(e) => {
                    setBloggerHtml(e.target.value);
                    saveStateToLocalStorage("cf_bloggerHtml", e.target.value);
                  }}
                  placeholder="수정할 구글 블로그 HTML 내용..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label className="form-label" style={{ marginBottom: "4px", fontSize: "11px", display: "block" }}>🖼️ 썸네일 (대표 이미지)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, setBloggerThumbnailBase64, "cf_bloggerThumbnailBase64")}
                    style={{ fontSize: "11px", color: "white", width: "100%" }}
                  />
                  {bloggerThumbnailBase64 && (
                    <img 
                      src={`data:image/png;base64,${bloggerThumbnailBase64}`} 
                      alt="blogger_thumb_preview" 
                      style={{ marginTop: "8px", width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }} 
                    />
                  )}
                </div>
                
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label className="form-label" style={{ marginBottom: "4px", fontSize: "11px", display: "block" }}>📊 본문 내 삽입 이미지</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, setBloggerContentImageBase64, "cf_bloggerContentImageBase64")}
                    style={{ fontSize: "11px", color: "white", width: "100%" }}
                  />
                  {bloggerContentImageBase64 && (
                    <img 
                      src={`data:image/png;base64,${bloggerContentImageBase64}`} 
                      alt="blogger_content_preview" 
                      style={{ marginTop: "8px", width: "100%", height: "80px", objectFit: "cover", borderRadius: "6px" }} 
                    />
                  )}
                </div>
              </div>

              {bloggerPublishResult && (
                <div style={{ background: "rgba(88,86,214,0.1)", border: "1px solid #5856d6", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: "800", color: "#5856d6", fontSize: "12px" }}>🎉 구글 블로그 임시저장 업로드 완료!</span>
                  {bloggerPublishResult.editLink && (
                    <a href={bloggerPublishResult.editLink} target="_blank" rel="noreferrer" style={{ color: "#ffd700", textDecoration: "underline", fontSize: "12px", fontWeight: "700" }}>
                      글 편집 및 승인하러 가기 🔗
                    </a>
                  )}
                </div>
              )}

              {/* ✅ 관련 링크 첨부 (글 끝 삽입) */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(88,86,214,0.3)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "#a78bfa" }}>🔗 관련 참고 링크 첨부 (글 끝에 자동 삽입)</span>
                  <span style={{ fontSize: "11px", opacity: 0.5 }}>유튜브/블로그 최대 3개</span>
                </div>
                {bloggerRelatedLinks.map((link, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={link.type}
                      onChange={(e) => {
                        const updated = bloggerRelatedLinks.map((l, i) => i === idx ? { ...l, type: e.target.value as "youtube" | "blog" } : l);
                        setBloggerRelatedLinks(updated);
                        saveStateToLocalStorage("cf_bloggerRelatedLinks", updated);
                      }}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", flexShrink: 0, cursor: "pointer", colorScheme: "dark" }}
                    >
                      <option value="youtube">📺 유튜브</option>
                      <option value="blog">📝 블로그</option>
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, height: "34px", fontSize: "12px", padding: "6px 10px" }}
                      placeholder={link.type === "youtube" ? "https://youtu.be/..." : "https://blog.naver.com/..."}
                      value={link.url}
                      onChange={(e) => {
                        const updated = bloggerRelatedLinks.map((l, i) => i === idx ? { ...l, url: e.target.value } : l);
                        setBloggerRelatedLinks(updated);
                        saveStateToLocalStorage("cf_bloggerRelatedLinks", updated);
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: "140px", flexShrink: 0, height: "34px", fontSize: "12px", padding: "6px 10px" }}
                      placeholder="링크 제목 (선택)"
                      value={link.title}
                      onChange={(e) => {
                        const updated = bloggerRelatedLinks.map((l, i) => i === idx ? { ...l, title: e.target.value } : l);
                        setBloggerRelatedLinks(updated);
                        saveStateToLocalStorage("cf_bloggerRelatedLinks", updated);
                      }}
                    />
                  </div>
                ))}
                {bloggerRelatedLinks.some(l => l.url.trim()) && (
                  <div style={{ background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                    💡 미리보기: 총 {bloggerRelatedLinks.filter(l => l.url.trim()).length}개 링크가 글 끝에 '관련 참고 링크' 섹션으로 삽입됩니다.
                  </div>
                )}
              </div>

              <button
                className="btn-submit"
                style={{ width: "100%", height: "38px", fontSize: "13px", borderRadius: "8px", background: "linear-gradient(135deg, #5856d6 0%, #4338ca 100%)", fontWeight: "bold", opacity: (bloggerMetaDescription.length >= 60 && bloggerMetaDescription.length <= 110) ? 1 : 0.6 }}
                onClick={handleBloggerPublish}
                disabled={loadingBloggerPublish}
              >
                {loadingBloggerPublish ? "구글 블로그 발행 중..." : "구글 블로그 발행 🚀"}
              </button>
            </div>

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

            <button
              onClick={() => setActiveSnsTab("facebook_insta")}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                color: activeSnsTab === "facebook_insta" ? "white" : "rgba(255,255,255,0.5)",
                borderBottom: activeSnsTab === "facebook_insta" ? "2px solid #ff2a5f" : "none",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              페이스북/인스타 캡션
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
                  value={refactorData.shorts}
                  onChange={(e) => {
                    const updated = { ...refactorData, shorts: e.target.value };
                    setRefactorData(updated);
                    saveStateToLocalStorage("cf_refactorData", updated);
                  }}
                  placeholder="쇼츠 대본 내용입니다. 자유롭게 수정하고 복사해서 사용할 수 있습니다."
                />
              </div>
            )}

            {activeSnsTab === "cards" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.2)" }}>
                  <label className="form-label" style={{ marginBottom: "6px", display: "block" }}>
                    🖼️ 1번 장 (인트로) 커스텀 디자인 이미지 첨부 (선택)
                  </label>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                    사용자가 직접 제미나이 등으로 만든 고퀄리티 이미지로 1번 카드 디자인 및 릴스 시작 화면을 완전히 대체합니다.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setCustomCardCoverBase64, "cf_customCardCoverBase64")}
                      style={{ fontSize: "12px", color: "white" }}
                    />
                    {customCardCoverBase64 && (
                      <button 
                        onClick={() => { setCustomCardCoverBase64(null); saveStateToLocalStorage("cf_customCardCoverBase64", null); }}
                        style={{ padding: "2px 8px", background: "#ff2a5f", color: "white", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>🎨 카드 테마 선택:</span>
                    <button onClick={() => setCardTheme("navy")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#0f172a", color: "#fbbf24", border: cardTheme === "navy" ? "2px solid #fbbf24" : "1px solid #333", fontSize: "12px", cursor: "pointer" }}>Navy (비즈니스)</button>
                    <button onClick={() => setCardTheme("beige")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#fdf8f5", color: "#ff6b35", border: cardTheme === "beige" ? "2px solid #ff6b35" : "1px solid #ddd", fontSize: "12px", cursor: "pointer" }}>Beige (감성)</button>
                    <button onClick={() => setCardTheme("white")} style={{ padding: "4px 10px", borderRadius: "4px", background: "#ffffff", color: "#3498db", border: cardTheme === "white" ? "2px solid #3498db" : "1px solid #ddd", fontSize: "12px", cursor: "pointer" }}>White (심플/IT)</button>
                    
                    <button 
                      onClick={downloadAllCards} 
                      style={{ 
                        marginLeft: "15px", 
                        padding: "6px 14px", 
                        borderRadius: "6px", 
                        background: "#ff2a5f", 
                        color: "white", 
                        border: "none", 
                        fontSize: "12px", 
                        fontWeight: "800", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px" 
                      }}
                    >
                      📥 전체 카드 이미지 다운로드 (일괄)
                    </button>

                    <button 
                      onClick={handleCreateReels} 
                      disabled={loadingReels}
                      style={{ 
                        marginLeft: "10px", 
                        padding: "6px 14px", 
                        borderRadius: "6px", 
                        background: "#0070f3", 
                        color: "white", 
                        border: "none", 
                        fontSize: "12px", 
                        fontWeight: "800", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px",
                        opacity: loadingReels ? 0.6 : 1
                      }}
                    >
                      {loadingReels ? "⚙️ 릴스 영상 제작 중..." : "🎬 릴스 영상 만들기"}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  {(Array.isArray(refactorData.cardNews) ? refactorData.cardNews : (refactorData.cardNews?.cards || [])).map((card: any, idx: number) => {
                    const theme = getThemeStyles();
                    
                    // 테마별 고해상도 그래픽 요소 렌더링 함수
                    const renderThemeDecorations = () => {
                      if (cardTheme === "navy") {
                        return (
                          <>
                            {/* 오로라 네온 발광 효과 */}
                            <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "250px", height: "250px", borderRadius: "50%", background: `radial-gradient(circle, ${theme.point}22 0%, ${theme.point}00 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
                            <div style={{ position: "absolute", bottom: "-100px", left: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #ff2a5f22 0%, #ff2a5f00 70%)", filter: "blur(70px)", pointerEvents: "none" }} />
                            {/* 프리미엄 도트 패턴 */}
                            <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: `radial-gradient(${theme.text} 1px, transparent 1px)`, backgroundSize: "20px 20px", pointerEvents: "none" }} />
                            {/* 백그라운드 거대 따옴표 기호 */}
                            {card.slide !== 1 && (
                              <div style={{ position: "absolute", top: "50px", left: "20px", fontSize: "140px", fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.03)", lineHeight: 0, fontWeight: "900", pointerEvents: "none" }}>“</div>
                            )}
                          </>
                        );
                      } else if (cardTheme === "beige") {
                        return (
                          <>
                            {/* 부드러운 오가닉 쉐이프 */}
                            <div style={{ position: "absolute", bottom: "-50px", right: "-50px", width: "220px", height: "220px", borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%", background: `${theme.point}0c`, filter: "blur(30px)", pointerEvents: "none" }} />
                            <div style={{ position: "absolute", top: "-60px", left: "-60px", width: "180px", height: "180px", borderRadius: "50%", background: `${theme.text}05`, filter: "blur(20px)", pointerEvents: "none" }} />
                            {/* 슬림 프레임 테두리 */}
                            <div style={{ position: "absolute", inset: "14px", border: `1px solid ${theme.point}18`, borderRadius: "12px", pointerEvents: "none" }} />
                            {/* 백그라운드 거대 따옴표 기호 */}
                            {card.slide !== 1 && (
                              <div style={{ position: "absolute", top: "50px", left: "20px", fontSize: "140px", fontFamily: "Georgia, serif", color: `${theme.text}04`, lineHeight: 0, fontWeight: "900", pointerEvents: "none" }}>“</div>
                            )}
                          </>
                        );
                      } else { // white (clean IT)
                        return (
                          <>
                            {/* 모던 인테리어 격자 그리드 */}
                            <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: `linear-gradient(${theme.point}15 1px, transparent 1px), linear-gradient(90deg, ${theme.point}15 1px, transparent 1px)`, backgroundSize: "24px 24px", pointerEvents: "none" }} />
                            <div style={{ position: "absolute", top: "-70px", right: "-70px", width: "200px", height: "200px", borderRadius: "50%", background: `radial-gradient(circle, ${theme.point}15 0%, ${theme.point}00 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />
                            {/* 좌측 사이드 포인트 라인 */}
                            {card.slide !== 1 && (
                              <div style={{ position: "absolute", left: "20px", top: "100px", bottom: "100px", width: "3px", background: `linear-gradient(to bottom, ${theme.point}, transparent)`, borderRadius: "2px", opacity: 0.4, pointerEvents: "none" }} />
                            )}
                          </>
                        );
                      }
                    };

                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "324px" }}>
                        <div
                          id={`card-slide-${card.slide}`}
                          style={{
                            width: "324px",
                            height: "576px",
                            background: (card.slide === 1 && customCardCoverBase64) ? `url(data:image/png;base64,${customCardCoverBase64}) center/cover no-repeat` : theme.bg,
                            color: theme.text,
                            padding: "55px 24px 40px 24px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box",
                            position: "relative",
                            overflow: "hidden",
                            fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif"
                          }}
                        >
                          {/* 테마별 그래픽 요소 */}
                          {!(card.slide === 1 && customCardCoverBase64) && renderThemeDecorations()}

                          {/* Top decorative line */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: `linear-gradient(90deg, ${theme.point} 0%, #ff2a5f 100%)` }} />
                          )}
                          
                          {/* Slide Indicator Badge */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ position: "absolute", top: "25px", right: "25px", fontSize: "11px", fontWeight: "800", opacity: 0.6, letterSpacing: "1px" }}>
                              {card.slide === 1 ? "INTRO" : `0${card.slide} / 05`}
                            </div>
                          )}

                          {/* Top Section */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: card.slide === 1 ? "center" : "flex-start", gap: "10px", marginTop: "10px", zIndex: 2 }}>
                              <span style={{ 
                                color: theme.point, 
                                fontSize: "11px", 
                                fontWeight: "900", 
                                textTransform: "uppercase", 
                                letterSpacing: "2px",
                                border: `1px solid ${theme.point}`,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "rgba(255,255,255,0.03)"
                              }}>
                                {card.slide === 1 ? "무림북 꿀팁 정보" : "CHECK POINT"}
                              </span>
                            </div>
                          )}

                          {/* Middle Section (Title & Content) */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: "20px", zIndex: 2 }}>
                              <h2 style={{ 
                                fontSize: card.slide === 1 ? "32px" : "22px", 
                                fontWeight: "900", 
                                lineHeight: "1.35", 
                                wordBreak: "keep-all", 
                                textAlign: card.slide === 1 ? "center" : "left",
                                color: theme.text,
                                letterSpacing: "-0.5px",
                                margin: 0
                              }}>
                                {card.title}
                              </h2>

                              {(card.body || card.content) && (
                                <div style={{
                                  background: theme.cardBg,
                                  border: `1px solid ${theme.cardBorder}`,
                                  borderRadius: "14px",
                                  padding: "20px 18px",
                                  backdropFilter: "blur(12px)",
                                  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)"
                                }}>
                                  <p style={{ 
                                    fontSize: "14px", 
                                    lineHeight: "1.6", 
                                    color: theme.sub, 
                                    wordBreak: "keep-all",
                                    margin: 0,
                                    fontWeight: "500",
                                    textAlign: "left"
                                  }}>
                                    {card.body || card.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bottom Section */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center",
                              borderTop: `1px solid ${theme.cardBorder}`,
                              paddingTop: "15px",
                              zIndex: 2
                            }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", opacity: 0.5 }}>
                                {card.slide === 1 ? "똑똑한 지출 가이드" : "murimbook.com"}
                              </span>
                              <span style={{ fontSize: "11px", fontWeight: "800", color: theme.point, letterSpacing: "0.5px" }}>
                                @murimbook
                              </span>
                            </div>
                          )}

                          {/* 카드별 하단 게이지(프로그레스) 바 */}
                          {!(card.slide === 1 && customCardCoverBase64) && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", background: "rgba(0,0,0,0.06)", zIndex: 3 }}>
                              <div style={{ width: `${(card.slide / 5) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${theme.point} 0%, #ff2a5f 100%)`, transition: "width 0.3s" }} />
                            </div>
                          )}
                        </div>
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
                  value={refactorData.xThread}
                  onChange={(e) => {
                    const updated = { ...refactorData, xThread: e.target.value };
                    setRefactorData(updated);
                    saveStateToLocalStorage("cf_refactorData", updated);
                  }}
                  placeholder="X 스레드 타래 내용입니다. 자유롭게 수정하고 복사해서 사용할 수 있습니다."
                />
              </div>
            )}



            {activeSnsTab === "facebook_insta" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>페이스북 & 인스타그램 업로드용 본문 캡션 및 해시태그</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(refactorData.snsCaption || "")}>
                    캡션 복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "250px", fontSize: "13px", lineHeight: "1.6" }}
                  value={refactorData.snsCaption || ""}
                  onChange={(e) => {
                    const updated = { ...refactorData, snsCaption: e.target.value };
                    setRefactorData(updated);
                    saveStateToLocalStorage("cf_refactorData", updated);
                  }}
                  placeholder="페이스북/인스타 포스팅에 함께 올라갈 본문 내용입니다. 자유롭게 수정하고 복사해서 사용할 수 있습니다."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
