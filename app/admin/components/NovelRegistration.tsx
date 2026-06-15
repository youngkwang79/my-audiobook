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
  const [novelStatus, setNovelStatus] = useState<"연재중" | "완결" | "준비중">(
    "완결",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [novelBadge, setNovelBadge] = useState("신작");
  const [novelExclusive, setNovelExclusive] = useState(true);
  const [novelFeatured, setNovelFeatured] = useState(true);
  const [novelIsMembershipOnly, setNovelIsMembershipOnly] = useState(false);
  const [novelThumbnail, setNovelThumbnail] = useState("");
  const [freeEpisodes, setFreeEpisodes] = useState<number | "">(10);
  const [totalEpisodes, setTotalEpisodes] = useState<number | "">(50);

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
        const ext = thumbnailFile.name.split(".").pop() || "png";
        const r2Key = `thumbnails/${novelId}_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append("file", thumbnailFile);
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
        <label className="form-label">소설 줄거리 및 시놉시스</label>
        <textarea
          className="form-textarea"
          rows={6}
          placeholder="작품 소개글을 입력하세요..."
          value={novelDesc}
          onChange={(e) => setNovelDesc(e.target.value)}
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
            <option value="준비중">준비중</option>
          </select>
        </div>
      </div>

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
