// app/admin/components/ContentFactoryPanel.tsx
"use client";

import { useState } from "react";

export default function ContentFactoryPanel() {
  const [query, setQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);

  // Selected keyword & generation states
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");

  // SNS Refactoring states
  const [loadingRefactor, setLoadingRefactor] = useState(false);
  const [refactorData, setRefactorData] = useState<{
    shorts: string;
    cardNews: any;
    xThread: string;
  } | null>(null);
  const [activeSnsTab, setActiveSnsTab] = useState<"shorts" | "cards" | "x">("shorts");

  // Publishing states
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    postId: string | null;
    editLink: string | null;
  } | null>(null);

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

  // Action 1: Search Trends
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setTrends([]);
    setGeneratedMarkdown("");
    setRefactorData(null);
    setPublishResult(null);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "search", query })
      });
      const data = await res.json();
      if (res.ok && data?.trends) {
        setTrends(data.trends);
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

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/content-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ action: "generate", keyword, title: titleSuggestion })
      });
      const data = await res.json();
      if (res.ok && data?.markdown) {
        setGeneratedMarkdown(data.markdown);
      } else {
        alert(`블로그 작성 실패: ${data?.error || "unknown"}`);
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
        setRefactorData({
          shorts: data.shorts,
          cardNews: data.cardNews,
          xThread: data.xThread
        });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Keyword Intake Section */}
      <div className="card-panel">
        <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🔍</span> Perplexity 트렌드 및 롱테일 소재 발굴
        </h3>
        <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px", lineHeight: "1.5" }}>
          구글/네이버에서 많은 사람이 찾지만 기존 검색결과의 정보가 미비하여 '공급 부족(Content Gap)' 상태인 블루오션 키워드와 구체적인 검색 의도를 분석해 냅니다.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="주요 분야나 대주제 키워드를 입력하세요 (예: Next.js 에러, 인공지능 수익화)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        </div>
      </div>

      {/* 2. Trends List */}
      {trends.length > 0 && (
        <div className="card-panel">
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "16px", color: "#ffd700" }}>
            🎯 추천 롱테일 키워드 후보군 (Content Gaps)
          </h3>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.6 }}>
                  <span>인스타그램 배포용 비주얼 가이드 & 카드별 문구</span>
                  <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => copyToClipboard(JSON.stringify(refactorData.cardNews, null, 2))}>
                    JSON 복사
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height: "250px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}
                  readOnly
                  value={JSON.stringify(refactorData.cardNews, null, 2)}
                />
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
