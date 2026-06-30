"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function BlogQuizManager() {
  const [blogUrl, setBlogUrl] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fileLabel, setFileLabel] = useState("퀴즈 JSON 파일 선택 또는 드래그");
  
  const [quizList, setQuizList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateFromUrl = async () => {
    if (!blogUrl.trim()) {
      alert("블로그 포스트 URL을 입력해 주세요.");
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setErrorMsg("로그인 세션이 만료되었습니다.");
        return;
      }

      const res = await fetch("/api/admin/blog-quizzes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: blogUrl.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBlogTitle(data.title);
        setJsonContent(JSON.stringify(data.quizPairs, null, 2));
        setSuccessMsg("⚡ AI가 블로그 본문을 분석하여 퀴즈 세트를 자동으로 생성했습니다. 아래 입력창의 결과를 검토하신 후 '퀴즈 등록'을 눌러 완성하세요!");
      } else {
        setErrorMsg(data.error || "퀴즈 자동 생성에 실패했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "서버 통신 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 현재 등록된 퀴즈 요약 목록 가져오기
  const fetchQuizzes = async () => {
    setFetching(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setErrorMsg("로그인 세션이 만료되었습니다.");
        return;
      }

      const res = await fetch("/api/admin/blog-quizzes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setQuizList(data.quizzes || []);
      } else {
        setErrorMsg(data.error || "퀴즈 목록을 불러오지 못했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "네트워크 에러가 발생했습니다.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const parseTxtToQuiz = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    const blogs: any[] = [];
    let currentBlog: any = null;
    let currentQ: any = null;

    for (const line of lines) {
      // 1. 블로그 주소(URL) 감지 -> 새로운 블로그 등록 블록 시작
      const urlMatch = line.match(/^(?:URL|주소|링크|Link)\s*[:.\-\s]+(.*)$/i) || line.match(/^(https?:\/\/[^\s]+)$/);
      const titleMatch = line.match(/^(?:제목|Title|식별값)\s*[:.\-\s]+(.*)$/i);

      if (urlMatch) {
        // 기존 블로그가 존재했다면 질문들 정리 후 저장
        if (currentBlog) {
          if (currentQ) {
            currentBlog.questions.push(currentQ);
            currentQ = null;
          }
          blogs.push(currentBlog);
        }
        currentBlog = {
          blog_url: urlMatch[1] ? urlMatch[1].trim() : line.trim(),
          blog_title: "",
          questions: []
        };
        continue;
      }

      if (titleMatch && currentBlog) {
        currentBlog.blog_title = titleMatch[1].trim();
        continue;
      }

      // 2. 문제 매칭 (Q1, 질문, 문제 등)
      const qMatch = line.match(/^(?:Q|질문|문제|Question)\s*\d*[:.\-\s]*(.*)$/i) ||
                     line.match(/^(\d+)[:.\-\s]+(.*\?)$/); // 끝에 물음표가 있는 숫자 시작 줄

      // 3. 보기 매칭 (1), 1., 1 - 등)
      const optMatch = line.match(/^([1-4])[\s\)\-\.\]]+(.*)$/);

      // 4. 정답 매칭 (정답:, 답:, A:)
      const ansMatch = line.match(/^(?:정답|답|A|Answer)\s*[:.\-\s]+(.*)$/i);

      if (qMatch && !optMatch) {
        if (currentBlog) {
          if (currentQ) {
            currentBlog.questions.push(currentQ);
          }
          currentQ = { question: qMatch[1] ? qMatch[1].trim() : line.trim(), options: [], answer: 0 };
        }
      } else if (optMatch && currentQ) {
        currentQ.options.push(optMatch[2].trim());
      } else if (ansMatch && currentQ) {
        const ansStr = ansMatch[1].trim();
        const numMatch = ansStr.match(/[1-4]/);
        if (numMatch) {
          currentQ.answer = Number(numMatch[0]) - 1;
        } else {
          const optIdx = currentQ.options.findIndex((o: string) => o.includes(ansStr) || ansStr.includes(o));
          if (optIdx !== -1) {
            currentQ.answer = optIdx;
          }
        }
      }
    }

    // 루프 끝난 후 마지막 블로그와 마지막 질문 정리
    if (currentBlog) {
      if (currentQ) {
        currentBlog.questions.push(currentQ);
      }
      blogs.push(currentBlog);
    }

    // 각 블로그의 질문들을 2개씩 쌍(Pair)으로 묶어서 API 규격 포맷으로 최종 가공
    const formattedBlogs = blogs.map((b) => {
      const pairs = [];
      const qList = b.questions;
      for (let i = 0; i < qList.length; i += 2) {
        if (i + 1 < qList.length) {
          pairs.push({
            q1_question: qList[i].question,
            q1_options: qList[i].options,
            q1_answer: qList[i].answer,
            q2_question: qList[i+1].question,
            q2_options: qList[i+1].options,
            q2_answer: qList[i+1].answer,
          });
        }
      }
      return {
        blogTitle: b.blog_title || "제목 없는 블로그",
        blogUrl: b.blog_url,
        quizPairs: pairs
      };
    });

    return formattedBlogs;
  };

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLabel(file.name);
    
    // 파일명에서 확장자를 제외하여 블로그 타이틀 기본값으로 설정
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    // 언더바(_)를 공백으로 치환하여 자연스러운 타이틀 유도
    setBlogTitle(nameWithoutExt.replace(/_/g, " "));

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = (event.target?.result as string).trim();

      // 1. JSON 감지 및 직접 파싱 시도 (JSON 내용을 그대로 복사해 .txt에 적은 경우도 지원)
      if (rawText.startsWith("[") || rawText.startsWith("{")) {
        try {
          const parsed = JSON.parse(rawText);
          setJsonContent(JSON.stringify(parsed, null, 2));
          return;
        } catch (e) {
          console.warn("JSON detection failed, falling back to TXT parsing:", e);
        }
      }

      // 2. 일반 줄글 형식의 .txt 파일 파싱
      if (file.name.toLowerCase().endsWith(".txt")) {
        try {
          const parsedBlogs = parseTxtToQuiz(rawText);
          setJsonContent(JSON.stringify(parsedBlogs, null, 2));
        } catch (err: any) {
          setErrorMsg(`텍스트 파일 파싱 오류: ${err.message}`);
        }
      } else {
        setJsonContent(rawText);
      }
    };
    reader.readAsText(file);
  };

  // 등록 핸들러
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!jsonContent.trim()) {
      setErrorMsg("퀴즈 데이터가 존재하지 않습니다.");
      return;
    }

    let parsedContent: any;
    try {
      parsedContent = JSON.parse(jsonContent);
    } catch (err: any) {
      setErrorMsg(`JSON 파싱 에러: ${err.message}`);
      return;
    }

    // 일괄 등록(Bulk) 감지: 
    // 배열이면서 첫 번째 요소가 blog_title, blogTitle, blog_url, blogUrl 중 하나를 갖고 있는 경우
    const isBulk = Array.isArray(parsedContent) && parsedContent.length > 0 && 
      (parsedContent[0].blog_title || parsedContent[0].blogTitle || parsedContent[0].blog_url || parsedContent[0].blogUrl);

    if (!isBulk) {
      if (!blogUrl.trim()) {
        setErrorMsg("블로그 포스트 URL을 입력해 주세요.");
        return;
      }
      if (!blogTitle.trim()) {
        setErrorMsg("블로그 제목(식별값)을 입력해 주세요.");
        return;
      }
    }

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setErrorMsg("로그인 세션이 만료되었습니다.");
        setLoading(false);
        return;
      }

      // 서버 전송 데이터 구성
      const payload = isBulk 
        ? parsedContent 
        : { blogTitle: blogTitle.trim(), blogUrl: blogUrl.trim(), quizPairs: parsedContent };

      const res = await fetch("/api/admin/blog-quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(
          isBulk 
            ? `🎉 성공적으로 ${data.count}개의 일괄 퀴즈 레코드를 등록/업데이트했습니다!`
            : `🎉 "${blogTitle}" 블로그에 ${data.count}개의 퀴즈 등록을 완료했습니다!`
        );
        // 상태 초기화
        setBlogUrl("");
        setBlogTitle("");
        setJsonContent("");
        setFileLabel("퀴즈 JSON 또는 TXT 파일 선택 또는 드래그");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchQuizzes();
      } else {
        setErrorMsg(data.error || data.message || "퀴즈 등록에 실패했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "서버 등록 중 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (title: string) => {
    if (!confirm(`"${title}"에 연결된 모든 퀴즈 세트를 정말로 삭제하시겠습니까?`)) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/admin/blog-quizzes?blogTitle=${encodeURIComponent(title)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setSuccessMsg("정상적으로 삭제되었습니다.");
        fetchQuizzes();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "삭제에 실패했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "삭제 통신 중 에러가 발생했습니다.");
    }
  };

  return (
    <div className="quiz-manager-panel" style={{ color: "white", padding: "10px 0" }}>
      <style>{`
        .qm-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .qm-card-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffe066;
        }
        .qm-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .qm-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .file-upload-zone {
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 30px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255,255,255,0.01);
        }
        .file-upload-zone:hover {
          border-color: #ff2a5f;
          background: rgba(255, 42, 95, 0.05);
        }
        .qm-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .qm-table th, .qm-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 14px;
        }
        .qm-table th {
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.02);
        }
        .qm-table tr:hover td {
          background: rgba(255,255,255,0.01);
        }
        .link-badge {
          color: #3b82f6;
          text-decoration: underline;
          word-break: break-all;
        }
        .status-alert {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 600;
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .alert-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
      `}</style>

      {/* 상태 메시지 */}
      {errorMsg && <div className="status-alert alert-error">⚠️ {errorMsg}</div>}
      {successMsg && <div className="status-alert alert-success">✓ {successMsg}</div>}

      <div className="qm-grid">
        {/* 업로드 등록 카드 */}
        <form onSubmit={handleRegister} className="qm-card">
          <h2 className="qm-card-title">📝 블로그 퀴즈 파일 등록</h2>
          
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">블로그 포스트 주소 (URL)</label>
            <input
              type="url"
              className="form-input"
              style={{ width: "100%", marginTop: 6 }}
              placeholder="예: https://blog.murimbook.com/?p=116"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">블로그 제목 (DB 퀴즈 식별값)</label>
            <input
              type="text"
              className="form-input"
              style={{ width: "100%", marginTop: 6 }}
              placeholder="예: nh농협금융지주 정기예금 이자 높은 곳 260 가입 조건"
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, display: "block" }}>
              * 텍스트 파일 내에 '제목: ...' 형식의 항목이 있다면 자동으로 세팅됩니다. 실제 포스트 식별값과 일치하게 수정해 주세요.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">퀴즈 데이터 (JSON 파일 또는 직접 편집)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div 
              className="file-upload-zone" 
              style={{ marginTop: 6, marginBottom: 12 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{fileLabel}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                JSON 또는 TXT 파일을 첨부하거나 아래 직접 편집창에 데이터를 입력해 등록하세요.
              </p>
            </div>
            <textarea
              className="form-textarea"
              rows={8}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 13, background: "rgba(0,0,0,0.2)", color: "#a8ffb2", padding: "10px" }}
              placeholder="여기에 퀴즈 JSON 데이터가 자동으로 채워집니다..."
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "퀴즈 업로드 중..." : "⚡ 퀴즈 일괄 업로드 등록"}
          </button>
        </form>

        {/* 현재 등록 현황 카드 */}
        <div className="qm-card">
          <h2 className="qm-card-title" style={{ color: "#3b82f6" }}>📊 현재 등록된 퀴즈 현황</h2>
          
          {fetching ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)" }}>
              퀴즈 목록을 불러오는 중...
            </div>
          ) : quizList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)" }}>
              등록된 블로그 퀴즈가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="qm-table">
                <thead>
                  <tr>
                    <th>블로그 식별 제목</th>
                    <th>퀴즈 개수</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {quizList.map((q) => (
                    <tr key={q.blog_title}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{q.blog_title}</div>
                        <a 
                          href={q.blog_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="link-badge"
                          style={{ fontSize: 12 }}
                        >
                          포스트 이동 ↗
                        </a>
                      </td>
                      <td style={{ color: "#ffe066", fontWeight: 800 }}>
                        {q.quiz_count} 세트
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(q.blog_title)}
                          className="btn-delete"
                          style={{ height: 32, fontSize: 12, padding: "0 10px", width: "auto" }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
