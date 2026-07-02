"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { drawTitleOnThumbnail } from "../utils/imageHelpers";

interface NovelEditProps {
  worksList: any[];
  fetchWorks: () => Promise<void>;
  initialWorkId?: string;
}

export default function NovelEdit({
  worksList,
  fetchWorks,
  initialWorkId = "",
}: NovelEditProps) {
  const [editWorkId, setEditWorkId] = useState(initialWorkId);
  const [editWork, setEditWork] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);

  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState("");
  const [editThumbnailUploading, setEditThumbnailUploading] = useState(false);

  const [generatingAiThumbnail, setGeneratingAiThumbnail] = useState(false);

  // 특정 작품 불러오기
  const fetchEditWork = async (id: string) => {
    if (!id) {
      setEditWork(null);
      setEditThumbnailPreview("");
      return;
    }
    setEditLoading(true);
    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setEditWork({ ...data });
        setEditThumbnailPreview(data.thumbnail || "");
        setEditThumbnailFile(null);
      }
    } catch (err: any) {
      alert("작품 정보 불러오기 실패: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    if (editWorkId) {
      fetchEditWork(editWorkId);
    }
  }, [editWorkId]);

  useEffect(() => {
    if (worksList.length > 0 && !editWorkId) {
      setEditWorkId(worksList[0].id);
    }
  }, [worksList]);

  const handleGenerateAiThumbnail = async () => {
    if (!editWork || !editWork.id || !editWork.title) {
      alert("소설 고유 ID와 제목을 먼저 입력해 주세요.");
      return;
    }

    setGeneratingAiThumbnail(true);
    let defaultPrompt = `${editWork.title} 소설 책 표지 일러스트, 동양 무협 판타지 스타일, 극화, 고화질`;

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
          body: JSON.stringify({ title: editWork.title, description: editWork.description }),
        });
        if (promptGenRes.ok) {
          const promptData = await promptGenRes.json();
          if (promptData.prompt) {
            defaultPrompt = promptData.prompt;
          }
        }
      } catch (geminiErr) {
        console.error("Gemini prompt generation failed, falling back to default:", geminiErr);
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
          novelId: editWork.id,
          prompt: promptValue || defaultPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 이미지 생성 실패");

      try {
        const subtitleVal = editWork.subtitle || "";
        const textOverlayBlob = await drawTitleOnThumbnail(
          data.thumbnailUrl,
          editWork.title,
          subtitleVal,
        );

        const fileName = data.thumbnailUrl.split("/").pop() || `${editWork.id}_${Date.now()}.png`;
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
        console.error("한글 제목 오버레이 적용 실패 (일반 이미지로 유지됨):", overlayErr);
        alert(
          "⚠️ 한글 제목 오버레이 적용 중 오류가 발생했습니다. 원본 이미지로 설정됩니다.\n오류: " +
            overlayErr.message,
        );
      }

      alert("✨ AI 썸네일 생성 및 한글 제목 오버레이 업로드가 완료되었습니다!");
      setEditWork((p: any) => ({ ...p, thumbnail: data.thumbnailUrl }));
      setEditThumbnailPreview(data.thumbnailUrl);
    } catch (err: any) {
      alert("AI 썸네일 생성 실패: " + err.message);
    } finally {
      setGeneratingAiThumbnail(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWork) return;
    setEditSaving(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      let finalThumbnail = editWork.thumbnail;

      if (editThumbnailFile) {
        setEditThumbnailUploading(true);

        // 한글 제목 오버레이 합성 적용
        let uploadBlob: Blob = editThumbnailFile;
        let ext = editThumbnailFile.name.split(".").pop() || "png";

        try {
          const tempUrl = URL.createObjectURL(editThumbnailFile);
          const subtitleVal = editWork.subtitle || "";
          const textOverlayBlob = await drawTitleOnThumbnail(
            tempUrl,
            editWork.title,
            subtitleVal
          );
          uploadBlob = textOverlayBlob;
          ext = "jpg"; // drawTitleOnThumbnail의 반환 타입은 항상 jpeg 포맷
          URL.revokeObjectURL(tempUrl);
        } catch (overlayErr) {
          console.warn("한글 제목 오버레이 자동 적용 실패 (원본 파일 업로드 진행):", overlayErr);
        }

        const r2Key = `thumbnails/${editWork.id}_${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append("file", uploadBlob, `thumbnail.${ext}`);
        formData.append("key", r2Key);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/direct-upload", true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () =>
            xhr.status === 200
              ? resolve()
              : reject(new Error(`업로드 실패: ${xhr.status}`));
          xhr.onerror = () => reject(new Error("네트워크 오류"));
          xhr.send(formData);
        });
        finalThumbnail = `/${r2Key}`;
        setEditThumbnailUploading(false);
      }

      const res = await fetch("/api/admin/upsert-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editWork.id,
          title: editWork.title,
          description: editWork.description,
          thumbnail: finalThumbnail,
          episode_count: editWork.episode_count,
          total_episodes: editWork.total_episodes,
          free_episodes: editWork.free_episodes,
          status: editWork.status,
          subtitle: editWork.subtitle,
          badge: editWork.badge,
          exclusive: editWork.exclusive,
          featured: editWork.featured,
          views: editWork.views ?? 0,
          is_membership_only: editWork.is_membership_only ?? false,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");
      alert("✅ 작품 정보가 성공적으로 수정되었습니다!");
      await fetchWorks();
      await fetchEditWork(editWork.id);
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally {
      setEditSaving(false);
      setEditThumbnailUploading(false);
    }
  };

  const handleDeleteWork = async () => {
    if (!editWork) return;
    const confirmDelete = window.confirm(
      `⚠️ 경고: [${editWork.title}] 작품을 삭제하시겠습니까?\n\n` +
        `작품 삭제 시 해당 작품의 모든 에피소드(회차) 목록과 사용자의 소장 내역(entitlements)도 함께 삭제됩니다.\n` +
        `이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?`,
    );
    if (!confirmDelete) return;

    setEditDeleting(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/delete-novel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editWork.id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "삭제 실패");

      alert("🗑️ 작품이 완벽하게 삭제되었습니다.");
      setEditWorkId("");
      setEditWork(null);
      await fetchWorks();
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    } finally {
      setEditDeleting(false);
    }
  };

  return (
    <div className="card-panel">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        📝 등록된 작품 정보 수정
      </h2>

      {/* 작품 선택 */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">수정할 작품 선택</label>
        <select
          className="form-select"
          value={editWorkId}
          onChange={(e) => setEditWorkId(e.target.value)}
        >
          <option value="">-- 작품을 선택하세요 --</option>
          {worksList.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      </div>

      {editLoading && (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
          불러오는 중...
        </div>
      )}

      {editWork && !editLoading && (
        <form onSubmit={handleEditSubmit}>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label" style={{ opacity: 0.5 }}>
              소설 ID (변경 불가)
            </label>
            <input
              className="form-input"
              value={editWork.id}
              disabled
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">소설 제목</label>
              <input
                className="form-input"
                value={editWork.title ?? ""}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    title: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">연재 상태</label>
              <select
                className="form-select"
                value={editWork.status ?? "연재중"}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
              >
                <option value="연재중">연재중</option>
                <option value="완결">완결</option>
                <option value="공개예정">공개예정</option>
                <option value="준비중">준비중</option>
              </select>
            </div>
          </div>

          {editWork.status === "공개예정" && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">📅 공개 예정 일시</label>
              <input
                type="datetime-local"
                className="form-input"
                value={
                  editWork.created_at
                    ? new Date(new Date(editWork.created_at).getTime() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setEditWork((p: any) => ({
                    ...p,
                    created_at: val ? new Date(val).toISOString() : null,
                  }));
                }}
                required
              />
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "4px" }}>
                * 설정한 예약 일시 기준으로 홈 화면 '공개 예정' 목록에 정렬되어 노출됩니다.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">줄거리 / 시놉시스</label>
            <textarea
              className="form-textarea"
              rows={5}
              value={editWork.description ?? ""}
              onChange={(e) =>
                setEditWork((p: any) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
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
              <label className="form-label">장르 태그 (subtitle)</label>
              <input
                className="form-input"
                placeholder="[회귀물] [복수극] ..."
                value={editWork.subtitle ?? ""}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    subtitle: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">무료 공개 화수</label>
              <input
                type="number"
                className="form-input"
                value={editWork.free_episodes ?? ""}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    free_episodes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">총 연재 예정 화수</label>
              <input
                type="number"
                className="form-input"
                value={editWork.total_episodes ?? ""}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    total_episodes: Number(e.target.value),
                  }))
                }
              />
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
              <label className="form-label">배지</label>
              <select
                className="form-select"
                value={editWork.badge ?? ""}
                onChange={(e) =>
                  setEditWork((p: any) => ({
                    ...p,
                    badge: e.target.value,
                  }))
                }
              >
                <option value="신작">신작</option>
                <option value="인기">인기</option>
                <option value="">없음</option>
              </select>
            </div>
            <div
              className="form-group"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 24,
                paddingTop: 28,
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
                  checked={editWork.exclusive ?? false}
                  onChange={(e) =>
                    setEditWork((p: any) => ({
                      ...p,
                      exclusive: e.target.checked,
                    }))
                  }
                />
                독점 공개
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
                  checked={editWork.featured ?? false}
                  onChange={(e) =>
                    setEditWork((p: any) => ({
                      ...p,
                      featured: e.target.checked,
                    }))
                  }
                />
                홈 추천작 노출
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
                  checked={editWork.is_membership_only ?? false}
                  onChange={(e) =>
                    setEditWork((p: any) => ({
                      ...p,
                      is_membership_only: e.target.checked,
                    }))
                  }
                />
                👑 멤버십 전용
              </label>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: 20,
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <label className="form-label" style={{ margin: 0 }}>
                🖼️ 표지 썸네일 변경
              </label>
              <button
                type="button"
                onClick={handleGenerateAiThumbnail}
                disabled={generatingAiThumbnail || !editWork.id || !editWork.title}
                style={{
                  background: "linear-gradient(135deg, #ff2a5f 0%, #fca834 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor:
                    generatingAiThumbnail || !editWork.id || !editWork.title
                      ? "not-allowed"
                      : "pointer",
                  opacity: generatingAiThumbnail || !editWork.id || !editWork.title ? 0.6 : 1,
                }}
              >
                {generatingAiThumbnail
                  ? "🎨 AI 이미지 생성 중..."
                  : "🎨 AI 썸네일 원클릭 생성"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              {editThumbnailPreview && (
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    현재 표지
                  </div>
                  <img
                    src={editThumbnailPreview}
                    alt="thumbnail"
                    style={{
                      width: 80,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    border: "2px dashed rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  className="upload-dropzone"
                  onClick={() =>
                    document.getElementById("edit-thumbnail-input")?.click()
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      setEditThumbnailFile(file);
                      setEditThumbnailPreview(URL.createObjectURL(file));
                    }
                  }}
                >
                  <input
                    type="file"
                    id="edit-thumbnail-input"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditThumbnailFile(file);
                        setEditThumbnailPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {editThumbnailFile ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      ✅ 새 이미지 선택됨: <strong>{editThumbnailFile.name}</strong>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditThumbnailFile(null);
                          setEditThumbnailPreview(editWork.thumbnail || "");
                        }}
                        style={{
                          marginLeft: 10,
                          background: "rgba(255,59,48,0.2)",
                          border: "1px solid #ff3b30",
                          color: "#ff453a",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      📤 새 이미지를 드래그하거나 클릭해서 선택
                    </div>
                  )}
                </div>
                {editThumbnailUploading && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#fca834",
                      marginTop: 8,
                    }}
                  >
                    썸네일 업로드 중...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className="btn-delete"
              onClick={handleDeleteWork}
              disabled={editSaving || editDeleting}
            >
              {editDeleting ? "🗑️ 삭제 중..." : "🗑️ 작품 삭제하기"}
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={editSaving || editDeleting}
            >
              {editSaving ? "저장 중..." : "✅ 변경사항 저장하기"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
