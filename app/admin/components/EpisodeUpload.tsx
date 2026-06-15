"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseFilename } from "../utils/stringHelpers";

interface EpisodeUploadProps {
  worksList: any[];
  fetchWorks: () => Promise<void>;
}

export default function EpisodeUpload({
  worksList,
  fetchWorks,
}: EpisodeUploadProps) {
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState<"auto" | "free" | "locked">("auto");
  const [episodeIsMembershipOnly, setEpisodeIsMembershipOnly] = useState(false);

  // 다중 파일 벌크 업로드용 큐 상태
  const [episodeQueue, setEpisodeQueue] = useState<
    Array<{
      id: string;
      title: string;
      file: File;
      progress: number;
      status: "idle" | "uploading" | "success" | "error";
      errorMsg?: string;
      is_membership_only?: boolean;
    }>
  >([]);
  const [isQueueUploading, setIsQueueUploading] = useState(false);

  useEffect(() => {
    if (worksList.length > 0 && !selectedWorkId) {
      setSelectedWorkId(worksList[0].id);
    }
  }, [worksList]);

  // 오디오 다중 파일 선택 처리
  const handleAudioFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { id, title } = parseFilename(file.name);
      newItems.push({
        id,
        title,
        file,
        progress: 0,
        status: "idle" as const,
        is_membership_only: episodeIsMembershipOnly,
      });
    }

    setEpisodeQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeQueueItem = (index: number) => {
    setEpisodeQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQueueItem = (
    index: number,
    key: "id" | "title" | "is_membership_only",
    value: any,
  ) => {
    setEpisodeQueue((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, [key]: value };
        }
        return item;
      }),
    );
  };

  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;

    const work = worksList.find((w) => w.id === selectedWorkId);
    const freeCount = work?.free_episodes ?? 10;

    const epNum = Number(episodeIdStr);
    if (isNaN(epNum)) {
      return true;
    }
    return epNum > freeCount;
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !episodeReleaseDate) {
      alert("공개 예정 일시를 설정해 주세요.");
      return;
    }

    if (episodeQueue.length === 0) {
      alert("업로드할 오디오 파일을 선택해 주세요.");
      return;
    }

    const pendingItems = episodeQueue.filter(
      (item) => item.status === "idle" || item.status === "error",
    );
    if (pendingItems.length === 0) {
      alert("업로드할 대기 중인 파일이 없습니다.");
      return;
    }

    setIsQueueUploading(true);

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      if (!token) throw new Error("로그인 세션이 만료되었습니다.");

      for (let i = 0; i < episodeQueue.length; i++) {
        const item = episodeQueue[i];
        if (item.status === "success") continue;

        setEpisodeQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "uploading" as const, progress: 0 } : q,
          ),
        );

        try {
          const isPureNumber = /^\d+$/.test(item.id);
          const epFolder = isPureNumber
            ? String(Number(item.id)).padStart(3, "0")
            : item.id;
          const ext = (item.file.name.split(".").pop() || "mp3").toUpperCase();
          const r2Key = `${selectedWorkId}/${epFolder}/01.${ext}`;

          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("key", r2Key);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/admin/direct-upload", true);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setEpisodeQueue((prev) =>
                  prev.map((q, idx) =>
                    idx === i ? { ...q, progress: pct } : q,
                  ),
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200) resolve();
              else reject(new Error(`R2 업로드 실패 (${xhr.status})`));
            };

            xhr.onerror = () => reject(new Error("네트워크 오류 발생"));
            xhr.send(formData);
          });

          const epRes = await fetch("/api/admin/upsert-episode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              work_id: selectedWorkId,
              id: item.id,
              title: item.title,
              locked: getEpisodeLockedStatus(item.id),
              parts: 1,
              release_date: new Date(episodeReleaseDate).toISOString(),
              is_membership_only: item.is_membership_only ?? false,
            }),
          });

          const epData = await epRes.json();
          if (!epRes.ok) {
            throw new Error(epData.error || "에피소드 DB 저장 실패");
          }

          setEpisodeQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: "success" as const, progress: 100 }
                : q,
            ),
          );
        } catch (itemErr: any) {
          console.error(`${item.file.name} 업로드 실패:`, itemErr);
          setEpisodeQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: "error" as const, errorMsg: itemErr.message }
                : q,
            ),
          );
        }
      }

      alert("🎉 모든 대기중인 회차 업로드 절차가 완료되었습니다!");
      await fetchWorks();
    } catch (err: any) {
      alert("업로드 처리 중 치명적 오류가 발생했습니다: " + err.message);
    } finally {
      setIsQueueUploading(false);
    }
  };

  return (
    <form onSubmit={handleEpisodeSubmit} className="card-panel">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        📚 신규 회차(에피소드) 일괄 추가 및 업로드
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.6)",
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        여러 개의 오디오 파일을 한 번에 선택하여 일괄 순차 업로드할 수
        있습니다. 파일명에서 회차 번호와 제목이 자동으로 파싱되며, 업로드
        전에 직접 수정할 수 있습니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div className="form-group">
          <label className="form-label">대상 소설 작품 선택</label>
          <select
            className="form-select"
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
          >
            {worksList.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">일괄 공개 예정 일시</label>
          <input
            type="datetime-local"
            className="form-input"
            value={episodeReleaseDate}
            onChange={(e) => setEpisodeReleaseDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginTop: 8,
        }}
      >
        <div className="form-group">
          <label className="form-label">기본 잠금 상태 설정</label>
          <select
            className="form-select"
            value={episodeLocked}
            onChange={(e) => setEpisodeLocked(e.target.value as any)}
          >
            <option value="auto">
              ✨ 작품 설정에 따라 자동 지정 (무료/유료 자동 분리)
            </option>
            <option value="free">
              🔓 전체 무료회차로 지정 (포인트 불필요)
            </option>
            <option value="locked">
              🔒 전체 유료회차로 지정 (포인트 필요)
            </option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">멤버십 전용 기본값</label>
          <label
            className="form-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              height: "42px",
              color: "#ff2a5f",
            }}
          >
            <input
              type="checkbox"
              checked={episodeIsMembershipOnly}
              onChange={(e) => setEpisodeIsMembershipOnly(e.target.checked)}
            />
            👑 멤버십 전용으로 지정
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            오디오 음원 파일 선택 (여러 파일 선택 가능, .mp3, .m4a)
          </label>
          <input
            type="file"
            accept="audio/*"
            multiple
            disabled={isQueueUploading}
            onChange={handleAudioFilesChange}
            className="form-input"
            style={{ padding: "8px 12px" }}
          />
        </div>
      </div>

      {episodeQueue.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 800,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>📋 업로드 대기열 ({episodeQueue.length}개 파일)</span>
            {!isQueueUploading && (
              <button
                type="button"
                onClick={() => setEpisodeQueue([])}
                style={{
                  background: "rgba(255, 59, 48, 0.15)",
                  border: "1px solid #ff3b30",
                  color: "#ff453a",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                목록 비우기
              </button>
            )}
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: 400,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {episodeQueue.map((item, index) => {
              const fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
              let statusColor = "rgba(255,255,255,0.4)";
              let statusText = "대기 중";
              let isProcessing = item.status === "uploading";
              let isSuccess = item.status === "success";
              let isError = item.status === "error";

              if (isProcessing) {
                statusColor = "#fca834";
                statusText = `업로드 중 (${item.progress}%)`;
              } else if (isSuccess) {
                statusColor = "#34c759";
                statusText = "완료";
              } else if (isError) {
                statusColor = "#ff453a";
                statusText = "실패";
              }

              return (
                <div
                  key={index}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: isProcessing
                      ? "1px solid #fca834"
                      : isSuccess
                        ? "1px solid rgba(52,199,89,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 16,
                    position: "relative",
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          background: statusColor + "1a",
                          color: statusColor,
                          border: `1px solid ${statusColor}`,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {statusText}
                      </span>
                      {(() => {
                        const actualLocked = getEpisodeLockedStatus(item.id);
                        const lockColor = actualLocked ? "#ff453a" : "#34c759";
                        const lockText = actualLocked ? "🔒 유료" : "🔓 무료";
                        return (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: lockColor + "1a",
                              color: lockColor,
                              border: `1px solid ${lockColor}`,
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {lockText}
                          </span>
                        );
                      })()}
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.4)",
                          wordBreak: "break-all",
                        }}
                      >
                        {item.file.name} ({fileSizeMB} MB)
                      </span>
                    </div>
                    {!isQueueUploading && !isSuccess && (
                      <button
                        type="button"
                        onClick={() => removeQueueItem(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff453a",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        제거
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 120px",
                      gap: 12,
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>
                        회차 번호
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        value={item.id}
                        disabled={isQueueUploading || isSuccess}
                        onChange={(e) => updateQueueItem(index, "id", e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>
                        회차 제목
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        value={item.title}
                        disabled={isQueueUploading || isSuccess}
                        onChange={(e) => updateQueueItem(index, "title", e.target.value)}
                        required
                      />
                    </div>
                    <div
                      className="form-group"
                      style={{
                        marginBottom: 0,
                        justifyContent: "center",
                      }}
                    >
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontSize: 12,
                          color: "#ff2a5f",
                          height: "100%",
                          marginTop: "18px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.is_membership_only ?? false}
                          disabled={isQueueUploading || isSuccess}
                          onChange={(e) => updateQueueItem(index, "is_membership_only", e.target.checked)}
                        />
                        👑 멤버십 전용
                      </label>
                    </div>
                  </div>

                  {isProcessing && (
                    <div style={{ marginTop: 12 }}>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${item.progress}%`,
                            background: "#fca834",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isError && item.errorMsg && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#ff453a",
                        marginTop: 8,
                        background: "rgba(255,69,58,0.08)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,69,58,0.2)",
                      }}
                    >
                      ⚠️ {item.errorMsg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn-submit"
        disabled={isQueueUploading || episodeQueue.length === 0}
        style={{ marginTop: 24 }}
      >
        {isQueueUploading
          ? "🚀 일괄 오디오 파일 순차 업로드 중..."
          : `회차 일괄 등록 및 파일 전송 시작 (${episodeQueue.length}개 파일)`}
      </button>
    </form>
  );
}
