"use client";

import { useState, useMemo } from "react";

type R2File = {
  key: string;
  size: number;
  lastModified: string;
  partName: string;
};

type EpisodeGroup = {
  folder: string;
  files: R2File[];
};

type Props = {
  worksList: any[];
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem("sb-auth-token");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || null;
    }

    // Supabase v2 fallback
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = JSON.parse(localStorage.getItem(key) || "{}");
        if (val?.access_token) return val.access_token;
      }
    }
  } catch {}
  return null;
}

export default function R2DownloadPanel({ worksList }: Props) {
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [episodes, setEpisodes] = useState<EpisodeGroup[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedEps, setExpandedEps] = useState<Set<string>>(new Set());

  const selectedWork = useMemo(
    () => worksList.find((w) => w.id === selectedWorkId),
    [worksList, selectedWorkId]
  );

  // 모든 파일 키 리스트
  const allKeys = useMemo(
    () => episodes.flatMap((ep) => ep.files.map((f) => f.key)),
    [episodes]
  );

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));

  // 파일 목록 조회
  const handleListFiles = async () => {
    if (!selectedWorkId) {
      alert("소설을 먼저 선택해주세요.");
      return;
    }
    setLoading(true);
    setStatusMsg("R2에서 파일 목록을 조회하는 중...");
    setEpisodes([]);
    setSelectedKeys(new Set());

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/r2-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ action: "list", workId: selectedWorkId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEpisodes(data.episodes || []);
        setTotalFiles(data.totalFiles || 0);
        setTotalSize(data.totalSize || 0);

        // 기본적으로 전체 선택
        const allFileKeys = new Set<string>();
        for (const ep of data.episodes || []) {
          for (const f of ep.files) {
            allFileKeys.add(f.key);
          }
        }
        setSelectedKeys(allFileKeys);

        // 모든 에피소드 펼치기
        const allFolders = new Set<string>();
        for (const ep of data.episodes || []) {
          allFolders.add(ep.folder);
        }
        setExpandedEps(allFolders);

        if (data.totalFiles === 0) {
          setStatusMsg("해당 소설의 R2 오디오 파일이 없습니다.");
        } else {
          setStatusMsg(`총 ${data.totalFiles}개 파일 (${formatBytes(data.totalSize)}) 조회 완료`);
        }
      } else {
        setStatusMsg(`조회 실패: ${data.error || "unknown"}`);
      }
    } catch (e: any) {
      setStatusMsg(`에러: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ZIP 다운로드
  const handleDownloadZip = async () => {
    if (selectedKeys.size === 0) {
      alert("다운로드할 파일을 선택해주세요.");
      return;
    }

    setDownloading(true);
    setStatusMsg(`${selectedKeys.size}개 파일을 ZIP으로 다운로드 중... (대용량일 경우 시간이 걸릴 수 있습니다)`);

    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/r2-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          action: "download-zip",
          workId: selectedWorkId,
          workTitle: selectedWork?.title || selectedWorkId,
          keys: Array.from(selectedKeys),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setStatusMsg(`다운로드 실패: ${errData.error || res.statusText}`);
        return;
      }

      // Blob 다운로드
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (selectedWork?.title || selectedWorkId)
        .replace(/[^a-zA-Z0-9가-힣_\- ]/g, "")
        .substring(0, 50);
      a.download = `${safeName}_audio.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatusMsg(`✅ ${selectedKeys.size}개 파일 다운로드 완료!`);
    } catch (e: any) {
      setStatusMsg(`다운로드 에러: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  // 에피소드 폴더 토글 (펼치기/접기)
  const toggleEpExpand = (folder: string) => {
    setExpandedEps((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  // 에피소드 전체 선택/해제
  const toggleEpisode = (ep: EpisodeGroup) => {
    const epKeys = ep.files.map((f) => f.key);
    const allEpSelected = epKeys.every((k) => selectedKeys.has(k));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allEpSelected) {
        epKeys.forEach((k) => next.delete(k));
      } else {
        epKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  // 개별 파일 토글
  const toggleFile = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 선택된 파일 크기 합계
  const selectedSize = useMemo(() => {
    let sum = 0;
    for (const ep of episodes) {
      for (const f of ep.files) {
        if (selectedKeys.has(f.key)) sum += f.size;
      }
    }
    return sum;
  }, [episodes, selectedKeys]);

  return (
    <div className="card-panel">
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
        📦 R2 오디오 파일 다운로드
      </h2>

      {/* 소설 선택 */}
      <div className="form-group">
        <label className="form-label">소설 선택</label>
        <select
          className="form-select"
          value={selectedWorkId}
          onChange={(e) => {
            setSelectedWorkId(e.target.value);
            setEpisodes([]);
            setSelectedKeys(new Set());
            setStatusMsg("");
          }}
        >
          <option value="">-- 소설을 선택하세요 --</option>
          {worksList.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title} ({w.id})
            </option>
          ))}
        </select>
      </div>

      {/* 파일 조회 버튼 */}
      <button
        className="btn-submit"
        onClick={handleListFiles}
        disabled={loading || !selectedWorkId}
        style={{ marginBottom: 16 }}
      >
        {loading ? "⏳ 조회 중..." : "🔍 R2 파일 목록 조회"}
      </button>

      {/* 상태 메시지 */}
      {statusMsg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: statusMsg.includes("✅")
              ? "rgba(52,199,89,0.12)"
              : statusMsg.includes("실패") || statusMsg.includes("에러")
              ? "rgba(255,59,48,0.12)"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${
              statusMsg.includes("✅")
                ? "rgba(52,199,89,0.3)"
                : statusMsg.includes("실패") || statusMsg.includes("에러")
                ? "rgba(255,59,48,0.3)"
                : "rgba(255,255,255,0.1)"
            }`,
            fontSize: 13,
            marginBottom: 16,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* 파일 목록 */}
      {episodes.length > 0 && (
        <>
          {/* 상단 요약 + 전체선택 + 다운로드 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {episodes.length}개 에피소드 · {totalFiles}개 파일 · {formatBytes(totalSize)}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label
                style={{
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ accentColor: "#ff2a5f" }}
                />
                전체 선택
              </label>
              <span style={{ fontSize: 12, opacity: 0.5 }}>
                ({selectedKeys.size}개 선택 · {formatBytes(selectedSize)})
              </span>
            </div>
          </div>

          {/* 에피소드별 파일 목록 */}
          <div
            style={{
              maxHeight: 500,
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {episodes.map((ep) => {
              const epKeys = ep.files.map((f) => f.key);
              const allEpSelected = epKeys.every((k) => selectedKeys.has(k));
              const someEpSelected = epKeys.some((k) => selectedKeys.has(k));
              const isExpanded = expandedEps.has(ep.folder);
              const epSize = ep.files.reduce((s, f) => s + f.size, 0);

              return (
                <div key={ep.folder}>
                  {/* 에피소드 헤더 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleEpExpand(ep.folder)}
                  >
                    <input
                      type="checkbox"
                      checked={allEpSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someEpSelected && !allEpSelected;
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleEpisode(ep);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: "#ff2a5f" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                      {isExpanded ? "▼" : "▶"} 에피소드 {ep.folder}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.5 }}>
                      {ep.files.length}개 · {formatBytes(epSize)}
                    </span>
                  </div>

                  {/* 파일 리스트 (펼쳤을 때) */}
                  {isExpanded &&
                    ep.files.map((file) => (
                      <div
                        key={file.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 14px 7px 38px",
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                          fontSize: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(file.key)}
                          onChange={() => toggleFile(file.key)}
                          style={{ accentColor: "#ff2a5f" }}
                        />
                        <span style={{ flex: 1, opacity: 0.9 }}>
                          🎵 {file.partName}
                        </span>
                        <span style={{ opacity: 0.4, fontSize: 11 }}>
                          {formatBytes(file.size)}
                        </span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>

          {/* 전체 다운로드 버튼 */}
          <button
            className="btn-submit"
            onClick={handleDownloadZip}
            disabled={downloading || selectedKeys.size === 0}
            style={{
              background: downloading
                ? "rgba(255,255,255,0.1)"
                : selectedKeys.size === 0
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg, #0a84ff 0%, #5856d6 100%)",
            }}
          >
            {downloading
              ? "⏳ ZIP 생성 및 다운로드 중..."
              : `📥 선택한 ${selectedKeys.size}개 파일 ZIP 다운로드 (${formatBytes(selectedSize)})`}
          </button>

          {downloading && (
            <div className="progress-bar-container" style={{ marginTop: 8 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: "100%",
                  animation: "pulse 1.5s ease-in-out infinite",
                  background: "linear-gradient(90deg, #0a84ff, #5856d6, #0a84ff)",
                  backgroundSize: "200% 100%",
                }}
              />
              <style>{`
                @keyframes pulse {
                  0% { background-position: 0% 50%; opacity: 0.6; }
                  50% { background-position: 100% 50%; opacity: 1; }
                  100% { background-position: 0% 50%; opacity: 0.6; }
                }
              `}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
