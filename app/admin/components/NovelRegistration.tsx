"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { romanizeHangeul } from "../utils/stringHelpers";
import { drawTitleOnThumbnail } from "../utils/imageHelpers";

interface NovelRegistrationProps {
  fetchWorks: () => Promise<void>;
  worksList: any[];
}

export default function NovelRegistration({
  fetchWorks,
  worksList,
}: NovelRegistrationProps) {
  const [novelId, setNovelId] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [novelDesc, setNovelDesc] = useState("");
  const [novelStatus, setNovelStatus] = useState<"연재중" | "완결" | "준비중" | "공개예정">(
    "완결",
  );
  const [novelScheduledAt, setNovelScheduledAt] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [novelBadge, setNovelBadge] = useState("신작");
  const [novelExclusive, setNovelExclusive] = useState(true);
  const [novelFeatured, setNovelFeatured] = useState(true);
  const [novelIsMembershipOnly, setNovelIsMembershipOnly] = useState(false);
  const [novelThumbnail, setNovelThumbnail] = useState("");
  const [freeEpisodes, setFreeEpisodes] = useState<number | "">(10);
  const [totalEpisodes, setTotalEpisodes] = useState<number | "">(50);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);

  // HTML -> Markdown 변환
  const htmlToMarkdown = (html: string) => {
    let md = html;
    // <strong> 태그 변환
    md = md.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
    md = md.replace(/<b>(.*?)<\/b>/g, "**$1**");
    // <a> 태그 변환 (스타일 제거 및 마크다운 링크 포맷)
    md = md.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)");
    return md;
  };

  // Markdown -> HTML 변환
  const markdownToHtml = (md: string) => {
    let html = md;
    // **굵게** -> <strong> 변환
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // [텍스트](링크) -> <a> 변환
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;font-weight:bold;">$1</a>');
    return html;
  };

  // 썸네일 직접 업로드 상태
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  // AI 썸네일 자동 생성 상태
  const [generatingAiThumbnail, setGeneratingAiThumbnail] = useState(false);

  const handleGenerateAiThumbnail = async () => {
    if (!novelId || !novelTitle) {
      alert(
        "소설 고유 ID와 제목을 먼저 입력해 주세요. 이를 기반으로 이미지가 생성됩니다.",
      );
      return;
    }

    setGeneratingAiThumbnail(true);
    let defaultPrompt = `${novelTitle} 소설 책 표지 일러스트, 동양 무협 판타지 스타일, 극화, 고화질`;

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      try {
        const promptGenRes = await fetch("/api/admin/generate-prompt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: novelTitle, description: novelDesc }),
        });
        if (promptGenRes.ok) {
          const promptData = await promptGenRes.json();
          if (promptData.prompt) {
            defaultPrompt = promptData.prompt;
          }
        }
      } catch (geminiErr) {
        console.error(
          "Gemini prompt generation failed, falling back to default:",
          geminiErr,
        );
      }

      setGeneratingAiThumbnail(false);

      const promptValue = prompt(
        "AI 표지 생성을 위한 지시어(영문 또는 한글)를 입력하세요.\n입력하지 않으면 분석된 정보(제목+줄거리)를 바탕으로 생성됩니다.",
        defaultPrompt,
      );
      if (promptValue === null) return;

      setGeneratingAiThumbnail(true);

      const res = await fetch("/api/admin/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          novelId: novelId,
          prompt: promptValue || defaultPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 이미지 생성 실패");

      try {
        const subtitleVal = selectedTags.join(" ");
        const textOverlayBlob = await drawTitleOnThumbnail(
          data.thumbnailUrl,
          novelTitle,
          subtitleVal,
        );

        const fileName = data.thumbnailUrl.split("/").pop() || `${novelId}_${Date.now()}.png`;
        const r2Key = `thumbnails/${fileName}`;

        const uploadFormData = new FormData();
        uploadFormData.append("file", textOverlayBlob, fileName);
        uploadFormData.append("key", r2Key);

        const uploadRes = await fetch("/api/admin/direct-upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadErr.error || "한글 제목 이미지 업로드 실패");
        }
      } catch (overlayErr: any) {
        console.error(
          "한글 제목 오버레이 적용 실패 (일반 이미지로 유지됨):",
          overlayErr,
        );
        alert(
          "⚠️ 한글 제목 오버레이 적용 중 오류가 발생했습니다. 원본 이미지로 설정됩니다.\n오류: " +
            overlayErr.message,
        );
      }

      alert("✨ AI 썸네일 생성 및 한글 제목 오버레이 업로드가 완료되었습니다!");
      setNovelThumbnail(data.thumbnailUrl);
      setThumbnailPreview(data.thumbnailUrl);
    } catch (err: any) {
      alert("AI 썸네일 생성 실패: " + err.message);
    } finally {
      setGeneratingAiThumbnail(false);
    }
  };

  const handleNovelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelId || !novelTitle) {
      alert("소설 ID와 제목은 필수 항목입니다.");
      return;
    }

    let finalThumbnailUrl = novelThumbnail || "/thumbnails/default.jpg";

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);

      if (thumbnailFile) {
        setThumbnailUploading(true);
        setThumbnailProgress(0);

        // 한글 제목 오버레이 합성 적용
        let uploadBlob: Blob = thumbnailFile;
        let ext = thumbnailFile.name.split(".").pop() || "png";

        try {
          const tempUrl = URL.createObjectURL(thumbnailFile);
          const subtitleVal = selectedTags.join(" ");
          const textOverlayBlob = await drawTitleOnThumbnail(
            tempUrl,
            novelTitle,
            subtitleVal
          );
          uploadBlob = textOverlayBlob;
          ext = "jpg"; // drawTitleOnThumbnail의 반환 타입은 항상 jpeg 포맷
          URL.revokeObjectURL(tempUrl);
        } catch (overlayErr) {
          console.warn("한글 제목 오버레이 자동 적용 실패 (원본 파일 업로드 진행):", overlayErr);
        }

        const r2Key = `thumbnails/${novelId}_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append("file", uploadBlob, `thumbnail.${ext}`);
        formData.append("key", r2Key);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/direct-upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              setThumbnailProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`업로드 실패 status: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("네트워크 오류 발생"));
          xhr.send(formData);
        });

        finalThumbnailUrl = `/${r2Key}`;
      }

      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isNew: true,
          id: novelId,
          title: novelTitle,
          description: novelDesc,
          thumbnail: finalThumbnailUrl,
          episode_count: 0,
          total_episodes: totalEpisodes === "" ? 50 : totalEpisodes,
          free_episodes: freeEpisodes === "" ? 10 : freeEpisodes,
          status: novelStatus,
          subtitle: selectedTags.join(" "),
          badge: novelBadge,
          views: 0,
          exclusive: novelExclusive,
          featured: novelFeatured,
          is_membership_only: novelIsMembershipOnly,
          created_at: novelStatus === "공개예정" && novelScheduledAt ? new Date(novelScheduledAt).toISOString() : new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "소설 등록 실패");
      }

      alert("소설이 성공적으로 등록되었습니다!");
      setNovelId("");
      setNovelTitle("");
      setNovelDesc("");
      setSelectedTags([]);
      setNovelBadge("신작");
      setNovelIsMembershipOnly(false);
      setNovelThumbnail("");
      setThumbnailFile(null);
      setThumbnailPreview("");
      setThumbnailProgress(0);
      await fetchWorks();
    } catch (err: any) {
      console.error(err);
      alert(`소설 등록 실패: ${err.message}`);
    } finally {
      setThumbnailUploading(false);
    }
  };

  return (
    <form onSubmit={handleNovelSubmit} className="card-panel">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        새로운 무협 소설 생성
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div className="form-group">
          <label className="form-label">
            소설 영문 고유 ID (예: cheonmujin)
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="cheonmujin"
            value={novelId}
            onChange={(e) => setNovelId(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">소설 제목</label>
          <input
            type="text"
            className="form-input"
            placeholder="천무진: 봉인된 천재"
            value={novelTitle}
            onChange={(e) => {
              const title = e.target.value;
              setNovelTitle(title);
              setNovelId(romanizeHangeul(title));
            }}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label className="form-label" style={{ margin: 0 }}>소설 줄거리 및 시놉시스</label>
          <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "6px" }}>
            <button
              type="button"
              style={{
                padding: "4px 10px", fontSize: "11px", fontWeight: "bold", border: "none", borderRadius: "4px", cursor: "pointer",
                background: !isMarkdownMode ? "rgba(37,99,235,0.9)" : "transparent",
                color: "white"
              }}
              onClick={() => {
                if (isMarkdownMode) {
                  // 마크다운 -> HTML 변환 후 기본 모드로 변경
                  const html = markdownToHtml(novelDesc);
                  setNovelDesc(html);
                  setIsMarkdownMode(false);
                }
              }}
            >
              기본 모드 (HTML)
            </button>
            <button
              type="button"
              style={{
                padding: "4px 10px", fontSize: "11px", fontWeight: "bold", border: "none", borderRadius: "4px", cursor: "pointer",
                background: isMarkdownMode ? "rgba(37,99,235,0.9)" : "transparent",
                color: "white"
              }}
              onClick={() => {
                if (!isMarkdownMode) {
                  // HTML -> 마크다운 변환 후 마크다운 모드로 변경
                  const md = htmlToMarkdown(novelDesc);
                  setNovelDesc(md);
                  setIsMarkdownMode(true);
                }
              }}
            >
              마크다운 모드
            </button>
          </div>
        </div>

        {/* 링크/굵게 편집 도구 추가 */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", opacity: 0.5, marginRight: "4px" }}>🔗 편집 도구 ({isMarkdownMode ? "마크다운" : "HTML"})</span>
          <button
            type="button"
            title="선택한 텍스트에 링크 삽입 (Ctrl+K)"
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", background: "rgba(37,99,235,0.8)",
              border: "1px solid rgba(37,99,235,0.5)", borderRadius: "6px",
              color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer"
            }}
            onMouseDown={(e) => {
              e.preventDefault(); // 포커스 잃지 않고 텍스트 선택 유지
              const ta = document.getElementById("novel-reg-desc-textarea") as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const selected = ta.value.substring(start, end);
              const url = window.prompt("삽입할 링크 URL을 입력하세요:", "https://");
              if (!url) return;
              const linkText = selected || "링크 텍스트";
              
              // 모드에 따라 마크다운 또는 HTML 삽입
              const linkMarkup = isMarkdownMode
                ? `[${linkText}](${url})`
                : `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${linkText}</a>`;
              
              const newVal = ta.value.substring(0, start) + linkMarkup + ta.value.substring(end);
              setNovelDesc(newVal);
              setTimeout(() => {
                ta.focus();
                ta.selectionStart = start + linkMarkup.length;
                ta.selectionEnd = start + linkMarkup.length;
              }, 0);
            }}
          >
            🔗 링크 삽입
          </button>
          <button
            type="button"
            title="선택한 텍스트를 굵게"
            style={{
              padding: "4px 10px", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px",
              color: "white", fontSize: "13px", fontWeight: "900", cursor: "pointer"
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const ta = document.getElementById("novel-reg-desc-textarea") as HTMLTextAreaElement;
              if (!ta) return;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const selected = ta.value.substring(start, end);
              
              // 모드에 따라 마크다운 또는 HTML 삽입
              const boldMarkup = isMarkdownMode
                ? `**${selected || "굵게"}**`
                : `<strong>${selected || "굵게"}</strong>`;
              
              const newVal = ta.value.substring(0, start) + boldMarkup + ta.value.substring(end);
              setNovelDesc(newVal);
            }}
          >
            B
          </button>
        </div>
        <textarea
          id="novel-reg-desc-textarea"
          className="form-textarea"
          rows={18}
          placeholder={isMarkdownMode ? "작품 소개글을 마크다운으로 입력하세요... 예: [무림북 바로가기](https://blog.murimbook.com)" : "작품 소개글을 입력하세요... (일반 텍스트 또는 HTML)"}
          value={novelDesc}
          onChange={(e) => setNovelDesc(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
              e.preventDefault();
              const ta = e.currentTarget;
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const selected = ta.value.substring(start, end);
              const url = window.prompt("삽입할 링크 URL을 입력하세요:", "https://");
              if (!url) return;
              const linkText = selected || "링크 텍스트";
              
              const linkMarkup = isMarkdownMode
                ? `[${linkText}](${url})`
                : `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;font-weight:bold;">${linkText}</a>`;
              
              const newVal = ta.value.substring(0, start) + linkMarkup + ta.value.substring(end);
              setNovelDesc(newVal);
            }
          }}
          style={{ minHeight: "360px", resize: "vertical" }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <div className="form-group">
          <label className="form-label">기본 무료 공개 화수</label>
          <input
            type="number"
            className="form-input"
            value={freeEpisodes}
            onChange={(e) => {
              const val = e.target.value;
              setFreeEpisodes(val === "" ? "" : Number(val));
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">총 연재 예정 화수</label>
          <input
            type="number"
            className="form-input"
            value={totalEpisodes}
            onChange={(e) => {
              const val = e.target.value;
              setTotalEpisodes(val === "" ? "" : Number(val));
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">연재 상태</label>
          <select
            className="form-select"
            value={novelStatus}
            onChange={(e) => setNovelStatus(e.target.value as any)}
          >
            <option value="연재중">연재중</option>
            <option value="완결">완결</option>
            <option value="공개예정">공개예정</option>
            <option value="준비중">준비중</option>
          </select>
        </div>
      </div>

      {novelStatus === "공개예정" && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">📅 공개 예정 일시</label>
          <input
            type="datetime-local"
            className="form-input"
            value={novelScheduledAt}
            onChange={(e) => setNovelScheduledAt(e.target.value)}
            required
          />
          <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "4px" }}>
            * 설정한 예약 일시 기준으로 홈 화면 '공개 예정' 목록에 정렬되어 노출됩니다.
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div className="form-group">
          <label className="form-label">장르 태그 선택</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
            }}
          >
            {[
              "[블로그]",
              "[공지사항]",
              "[회귀물]",
              "[복수극]",
              "[의선]",
              "[성장]",
              "[복수]",
              "[정통무협]",
              "[환생물]",
              "[먼치킨]",
              "[사이다]",
              "[미스터리]",
            ].map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTags((prev) => prev.filter((t) => t !== tag));
                    } else {
                      setSelectedTags((prev) => [...prev, tag]);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: isSelected
                      ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)"
                      : "rgba(255,255,255,0.05)",
                    border: isSelected
                      ? "1px solid #ff2a5f"
                      : "1px solid rgba(255,255,255,0.12)",
                    color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                    boxShadow: isSelected
                      ? "0 0 10px rgba(255, 42, 95, 0.4)"
                      : "none",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">노출 배지 선택</label>
          <select
            className="form-select"
            value={novelBadge}
            onChange={(e) => setNovelBadge(e.target.value)}
          >
            <option value="신작">신작</option>
            <option value="">없음</option>
          </select>
        </div>
      </div>

      <div
        className="form-group"
        style={{
          flexDirection: "row",
          gap: 24,
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        <label
          className="form-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={novelExclusive}
            onChange={(e) => setNovelExclusive(e.target.checked)}
          />
          독점 공개 여부
        </label>
        <label
          className="form-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={novelFeatured}
            onChange={(e) => setNovelFeatured(e.target.checked)}
          />
          홈페이지 추천작 노출
        </label>
        <label
          className="form-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            color: "#ff2a5f",
          }}
        >
          <input
            type="checkbox"
            checked={novelIsMembershipOnly}
            onChange={(e) => setNovelIsMembershipOnly(e.target.checked)}
          />
          👑 멤버십 전용 작품
        </label>
      </div>

      <div
        className="form-group"
        style={{
          background: "rgba(255,255,255,0.02)",
          padding: 20,
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: 12,
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label
            className="form-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              margin: 0,
            }}
          >
            🖼️ 소설 표지 썸네일
          </label>
          <button
            type="button"
            onClick={handleGenerateAiThumbnail}
            disabled={generatingAiThumbnail || !novelId || !novelTitle}
            style={{
              background: "linear-gradient(135deg, #ff2a5f 0%, #fca834 100%)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor:
                generatingAiThumbnail || !novelId || !novelTitle
                  ? "not-allowed"
                  : "pointer",
              opacity: generatingAiThumbnail || !novelId || !novelTitle ? 0.6 : 1,
            }}
          >
            {generatingAiThumbnail
              ? "🎨 AI 이미지 생성 중..."
              : "🎨 AI 썸네일 원클릭 생성"}
          </button>
        </div>

        <div
          style={{
            border: "2px dashed rgba(255, 255, 255, 0.1)",
            borderRadius: 10,
            padding: "30px 20px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            position: "relative",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) {
              setThumbnailFile(file);
              setThumbnailPreview(URL.createObjectURL(file));
            }
          }}
          onClick={() => {
            document.getElementById("thumbnail-file-input")?.click();
          }}
          className="upload-dropzone"
        >
          <input
            type="file"
            id="thumbnail-file-input"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setThumbnailFile(file);
                setThumbnailPreview(URL.createObjectURL(file));
              }
            }}
          />

          {thumbnailPreview ? (
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                justifyContent: "center",
                textAlign: "left",
              }}
            >
              <img
                src={thumbnailPreview}
                alt="Thumbnail Preview"
                style={{
                  width: 90,
                  height: 135,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>
                  선택된 이미지
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 4,
                    wordBreak: "break-all",
                  }}
                >
                  {thumbnailFile?.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 2,
                  }}
                >
                  {((thumbnailFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setThumbnailFile(null);
                    setThumbnailPreview("");
                  }}
                  style={{
                    marginTop: 8,
                    background: "rgba(255, 59, 48, 0.2)",
                    border: "1px solid #ff3b30",
                    color: "#ff453a",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  제거
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                이미지 파일을 드래그하여 놓거나 클릭하여 선택
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 4,
                }}
              >
                JPEG, PNG, WEBP 등 지원 (권장 비율 2:3)
              </div>
            </div>
          )}
        </div>

        {thumbnailUploading && (
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${thumbnailProgress}%` }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                opacity: 0.7,
                marginTop: 4,
              }}
            >
              <span>표지 업로드 중...</span>
              <span>{thumbnailProgress}%</span>
            </div>
          </div>
        )}
      </div>

      <button type="submit" className="btn-submit">
        작품 생성하기
      </button>
    </form>
  );
}
