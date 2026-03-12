"use client";

import TopBar from "@/app/components/TopBar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// ✅ 기본값: 아직 파트 수 확정 안 된 화는 일단 30으로
const DEFAULT_TOTAL_PARTS = 30;

// ✅ 무료 파트 기준(원래 1~8 무료)
const DEFAULT_FREE_PARTS = 8;

// ✅ 포인트 정책: 60포인트당 1편 해제
const POINTS_PER_PART = 60;

// ✅ 작품/파일명 프리픽스(남겨둠)
const SERIES_PREFIX = "cheonmujin";

// ✅ 작품 기본 썸네일(fallback)
const WORK_THUMBNAIL = "/thumbnails/cheonmujin.jpg";

// ✅ 화별 파트 수(분량) 설정 (사용자 제공값 반영: 1~54 + 32-1)
const EPISODE_TOTAL_PARTS: Record<string, number> = {
  "1": 4,
  "2": 6,
  "3": 4,
  "4": 3,
  "5": 3,
  "6": 6,
  "7": 5,
  "8": 6,
  "9": 5,
  "10": 4,
  "11": 5,
  "12": 1,
  "13": 1,
  "14": 1,
  "15": 1,
  "16": 1,
  "17": 1,
  "18": 1,
  "19": 1,
  "20": 1,
  "21": 1,
  "22": 1,
  "23": 1,
  "24": 1,
  "25": 10,
  "26": 25,
  "27": 1,
  "28": 1,
  "29": 1,
  "30": 1,
  "31": 1,
  "32": 1,
  "32-1": 1,
  "33": 1,
  "34": 1,
  "35": 1,
  "36": 1,
  "37": 1,
  "38": 1,
  "39": 1,
  "40": 1,
  "41": 1,
  "42": 10,
  "43": 12,
  "44": 1,
  "45": 9,
  "46": 9,
  "47": 1,
  "48": 11,
  "49": 1,
  "50": 1,
  "51": 26,
  "52": 1,
  "53": 1,
  "54": 15,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}

// ✅ "32-1" 같은 id도 R2 폴더명으로 안전하게 바꿈
function getEpisodeFolder(episodeKey: string) {
  if (/^\d+$/.test(episodeKey)) return pad3(Number(episodeKey));
  const m = episodeKey.match(/^(\d+)-(.*)$/);
  if (!m) return episodeKey;
  return `${pad3(Number(m[1]))}-${m[2]}`;
}

function getTotalParts(episodeKey: string) {
  return EPISODE_TOTAL_PARTS[episodeKey] ?? DEFAULT_TOTAL_PARTS;
}

function getFreeParts(episodeKey: string) {
  return Math.min(DEFAULT_FREE_PARTS, getTotalParts(episodeKey));
}

// ✅ (예전 public/audio 방식용 - 지금은 R2 사용중) 남겨둠
function getAudioPath(episodeKey: string, part: number) {
  const epFolder = getEpisodeFolder(episodeKey);
  const pt = pad2(part);
  return `/audio/${SERIES_PREFIX}_${epFolder}_${pt}.mp3`;
}

type EntitlementPayload = {
  points: number;
  is_subscribed: boolean;
  unlocked_until_part: number | null;
};

async function fetchEntitlement(episodeKey: string): Promise<EntitlementPayload> {
  const qs = new URLSearchParams({
    work_id: SERIES_PREFIX,
    episode_id: episodeKey,
  });

  const res = await fetch(`/api/me/entitlements?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed_to_fetch_entitlements");
  return res.json();
}

// ✅ 숫자 화의 마지막 번호(자동 다음화 이동 안전장치)
const LAST_NUM_EPISODE = Math.max(
  ...Object.keys(EPISODE_TOTAL_PARTS)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => Number(k))
);

// =========================
// ✅ 자막 타입
// =========================
type Segment = { start: number; end: number; text: string };

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ 핵심: id를 문자열로 유지 (예: "32-1")
  const episodeKey = String(params.id);
  const autoplay = searchParams.get("autoplay") === "1";

  // ✅ 이 화의 총 파트/무료 파트
  const TOTAL_PARTS = useMemo(() => getTotalParts(episodeKey), [episodeKey]);
  const FREE_PARTS = useMemo(() => getFreeParts(episodeKey), [episodeKey]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ 중복 이동 방지(보험)
  const isNavigatingRef = useRef(false);
  useEffect(() => {
    isNavigatingRef.current = false;
  }, [episodeKey]);

  // ✅ DB 기반 상태
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [unlockedUntil, setUnlockedUntilState] = useState(FREE_PARTS);
  const [points, setPointsState] = useState(0);

  // ✅ 현재 선택된 “편(파트)”
  const [part, setPart] = useState(1);
  const [status, setStatus] = useState("");
  const [entBusy, setEntBusy] = useState(false);

  // =========================
  // ✅ 자막 상태
  // =========================
  const [segments, setSegments] = useState<Segment[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [captionStatus, setCaptionStatus] = useState<string>("");
  const segIndexRef = useRef<number>(0);

  // =========================
  // ✅ 이미지 상태
  // =========================
  const [imageIndex, setImageIndex] = useState(0);
  const [imageErrorCount, setImageErrorCount] = useState(0);

  // ✅ 마지막 재생 저장(화면용 캐시 유지)
  useEffect(() => {
    if (!episodeKey) return;
    if (!Number.isFinite(part)) return;

    localStorage.setItem(
      "lastPlayed",
      JSON.stringify({
        episodeId: episodeKey,
        part,
        updatedAt: Date.now(),
      })
    );
  }, [episodeKey, part]);

  // ✅ URL part 기준으로 시작
  useEffect(() => {
    const p = Number(searchParams.get("part") || 1);
    const safeP = Math.max(1, Math.min(TOTAL_PARTS, Number.isFinite(p) ? p : 1));
    setPart(safeP);
  }, [episodeKey, searchParams, TOTAL_PARTS]);

  // ✅ DB에서 권한/포인트/구독 상태 로드
  useEffect(() => {
    let alive = true;
    setEntBusy(true);

    (async () => {
      try {
        const data = await fetchEntitlement(episodeKey);
        if (!alive) return;

        setIsSubscribed(!!data.is_subscribed);

        const serverUnlocked = data.unlocked_until_part ?? FREE_PARTS;
        const safeUnlocked = Math.max(FREE_PARTS, Math.min(TOTAL_PARTS, serverUnlocked));
        setUnlockedUntilState(safeUnlocked);

        setPointsState(Number.isFinite(data.points) ? Math.max(0, data.points) : 0);
      } catch {
        setIsSubscribed(false);
        setUnlockedUntilState(FREE_PARTS);
        setPointsState(0);
      } finally {
        if (alive) setEntBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [episodeKey, FREE_PARTS, TOTAL_PARTS]);

  // ✅ 잠금 여부: 구독이면 항상 false
  const locked = useMemo(() => {
    if (isSubscribed) return false;
    return part > unlockedUntil;
  }, [part, unlockedUntil, isSubscribed]);

  // ✅ R2 경로
  const R2_BASE = "https://pub-593ff1dc4440464cb156da505f73a555.r2.dev";

  const getR2AudioUrl = (episodeKey: string, part: number) => {
    const folder = getEpisodeFolder(episodeKey);
    return `${R2_BASE}/${folder}/${pad2(part)}.MP3`;
  };

  // ✅ 이미지 후보 경로
  const getR2ImageCandidates = (episodeKey: string, part: number) => {
    const folder = getEpisodeFolder(episodeKey);
    const base = `${R2_BASE}/${folder}/${pad2(part)}`;
    return [
      `${base}.jpg`,
      `${base}.jpeg`,
      `${base}.png`,
      `${base}.webp`,
    ];
  };

  // ✅ 자막 JSON 경로
  const getR2CaptionUrl = (episodeKey: string, part: number) => {
    const folder = getEpisodeFolder(episodeKey);
    return `${R2_BASE}/${folder}/${pad2(part)}.json`;
  };

  // ✅ Worker(생성용) URL
  const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";
  const getWorkerUrl = (episodeKey: string, part: number) =>
    `${WORKER_BASE}/?episode=${encodeURIComponent(episodeKey)}&part=${encodeURIComponent(String(part))}`;

  // ✅ 오디오 경로 (R2 사용)
  const audioSrc = !locked ? getR2AudioUrl(episodeKey, part) : null;

  // ✅ 이미지 후보 계산
  const imageCandidates = useMemo(() => getR2ImageCandidates(episodeKey, part), [episodeKey, part]);

  // ✅ 화/편 바뀌면 이미지 후보 탐색 초기화
  useEffect(() => {
    setImageIndex(0);
    setImageErrorCount(0);
  }, [episodeKey, part]);

  // ✅ 현재 이미지 src
  const currentImageSrc =
    imageErrorCount >= imageCandidates.length
      ? WORK_THUMBNAIL
      : imageCandidates[imageIndex] || WORK_THUMBNAIL;

  // =========================
  // ✅ 자막 로드: R2 json 먼저 읽고, 없으면 Worker 호출로 생성 후 다시 읽기
  // =========================
  useEffect(() => {
    let alive = true;

    async function fetchJsonSafe(url: string) {
      const u = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const res = await fetch(u, { cache: "no-store" });
      const text = await res.text();

      if (!res.ok) {
        return { ok: false as const, status: res.status, text };
      }

      try {
        const data = JSON.parse(text);
        return { ok: true as const, status: res.status, data };
      } catch {
        return { ok: false as const, status: res.status, text };
      }
    }

    async function loadCaptions() {
      setSegments([]);
      setCaption("");
      segIndexRef.current = 0;

      if (locked) {
        setCaptionStatus("");
        return;
      }

      setCaptionStatus("자막 불러오는 중...");

      const jsonUrl = getR2CaptionUrl(episodeKey, part);

      const r2 = await fetchJsonSafe(jsonUrl);
      if (!alive) return;

      if (r2.ok) {
        const parsed = parseSegmentsFromSavedJson(r2.data);
        setSegments(parsed);
        setCaptionStatus(parsed.length ? "자막 준비 완료" : "자막 데이터가 비어있어요");
        return;
      }

      setCaptionStatus("자막 생성 중(처음 1회)...");

      const workerRes = await fetch(getWorkerUrl(episodeKey, part), { cache: "no-store" });
      if (!workerRes.ok) {
        if (!alive) return;
        setCaptionStatus("자막 생성 실패(Worker 오류)");
        return;
      }

      const r2b = await fetchJsonSafe(jsonUrl);
      if (!alive) return;

      if (!r2b.ok) {
        const preview = (r2b.text || "").slice(0, 80).replace(/\s+/g, " ");
        setCaptionStatus(`자막 파일 파싱 실패(R2) ${r2b.status}: ${preview}`);
        return;
      }

      const parsed2 = parseSegmentsFromSavedJson(r2b.data);
      setSegments(parsed2);
      setCaptionStatus(parsed2.length ? "자막 준비 완료" : "자막 데이터가 비어있어요");
    }

    loadCaptions().catch((e) => {
      if (!alive) return;
      setCaptionStatus("자막 로드 중 오류");
      console.error("[caption] load error:", e);
    });

    return () => {
      alive = false;
    };
  }, [episodeKey, part, locked]);

  function parseSegmentsFromSavedJson(saved: any): Segment[] {
    const aiResp = saved?.aiResp ?? saved;

    const segs = aiResp?.segments;
    if (Array.isArray(segs)) {
      return segs
        .map((s: any) => ({
          start: Number(s.start ?? s.t0 ?? 0),
          end: Number(s.end ?? s.t1 ?? 0),
          text: String(s.text ?? s.transcript ?? ""),
        }))
        .filter((s: Segment) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.text.trim().length > 0);
    }

    const text = aiResp?.text;
    if (typeof text === "string" && text.trim()) {
      return [{ start: 0, end: 999999, text }];
    }

    return [];
  }

  // =========================
  // ✅ 현재 재생 시간에 맞춰 자막 업데이트
  // =========================
  const updateCaptionByTime = (t: number) => {
    const segs = segments;
    if (!segs.length) {
      setCaption("");
      return;
    }

    let i = segIndexRef.current;
    i = Math.max(0, Math.min(i, segs.length - 1));

    while (i < segs.length - 1 && t > segs[i].end) i++;
    while (i > 0 && t < segs[i].start) i--;

    segIndexRef.current = i;

    const s = segs[i];
    if (t >= s.start && t <= s.end) setCaption(s.text);
    else setCaption("");
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    updateCaptionByTime(a.currentTime);
  };

  // ✅ 자동재생
  useEffect(() => {
    if (!autoplay) return;
    if (locked) return;

    const t = setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;

      a.play()
        .then(() => setStatus("재생 중"))
        .catch(() => setStatus("자동재생이 차단됐어요. 재생 버튼을 한 번 눌러주세요."));
    }, 50);

    return () => clearTimeout(t);
  }, [autoplay, locked, episodeKey, part]);

  const playNow = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      setStatus("재생 중");
    } catch {
      setStatus("재생이 차단됐어요. 브라우저 설정에서 자동재생을 허용해 주세요.");
    }
  };

  const pauseNow = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setStatus("일시정지");
  };

  const goNextEpisode = () => {
    if (isNavigatingRef.current) return;

    if (!/^\d+$/.test(episodeKey)) {
      setStatus("다음 화 자동이동은 숫자 화에서만 지원됩니다.");
      return;
    }

    const currentEp = Number(episodeKey);
    if (!Number.isFinite(currentEp) || currentEp >= LAST_NUM_EPISODE) {
      setStatus("마지막 화입니다.");
      return;
    }

    isNavigatingRef.current = true;
    const nextEpisodeKey = String(currentEp + 1);

    router.replace(`/episode/${nextEpisodeKey}?part=1&autoplay=1`);
  };

  const goNextPart = () => {
    if (part >= TOTAL_PARTS) {
      setStatus("다음 화로 넘어가는 중...");
      goNextEpisode();
      return;
    }

    const next = part + 1;
    setPart(next);

    const nextLocked = !isSubscribed && next > unlockedUntil;
    router.replace(`/episode/${episodeKey}?part=${next}${nextLocked ? "" : "&autoplay=1"}`);
  };

  const goPrevPart = () => {
    const prev = Math.max(1, part - 1);
    setPart(prev);

    const prevLocked = !isSubscribed && prev > unlockedUntil;
    router.replace(`/episode/${episodeKey}?part=${prev}${prevLocked ? "" : "&autoplay=1"}`);
  };

  const unlockAllParts = () => {
    alert("광고 리워드(서버 검증) 붙이면 전체 오픈으로 연결됩니다. 지금은 준비중입니다.");
  };

  const unlockWithPoints = async () => {
    const next = Math.min(TOTAL_PARTS, unlockedUntil + 1);

    try {
      const res = await fetch("/api/unlock/with-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_id: SERIES_PREFIX,
          episode_id: episodeKey,
          target_unlock_until_part: next,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "not_enough_points") {
          alert(`포인트가 부족합니다. (${data?.need ?? POINTS_PER_PART}포인트 필요)`);
          return;
        }
        alert("오류가 발생했습니다.");
        return;
      }

      setPointsState(data.points_left);
      setUnlockedUntilState(data.unlocked_until_part);

      router.replace(`/episode/${episodeKey}?part=${part}&autoplay=1`);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const bounceCSS = `
    @keyframes bounceIn {
      0% { transform: scale(0.95); opacity: 0; }
      60% { transform: scale(1.02); opacity: 1; }
      100% { transform: scale(1); }
    }
  `;

  const mobileCSS = `
    @media (max-width: 820px) {
      .episodeMain { padding-bottom: 120px !important; }
      .episodeGrid { grid-template-columns: 1fr !important; }
      .episodeAside { position: static !important; top: auto !important; }
      .audioDock {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;
        padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
        background: rgba(10, 10, 18, 0.92);
        border-top: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(10px);
      }
      .audioDock audio { width: 100% !important; margin-top: 0 !important; }
    }

    .lockCard {
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 820px) {
      .lockWrap {
        min-height: auto !important;
        padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
      }
      .lockCard {
        width: min(480px, 84vw) !important;
        max-height: calc(100vh - 140px) !important;
      }
      .lockBtns {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 10px !important;
      }
      .lockBtns button { width: 100% !important; }

      html, body { overflow-x: hidden; }

      .episodeMain {
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }

      .partGrid {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        max-width: 100% !important;
      }

      button { max-width: 100% !important; }
      .lockCard * { word-break: keep-all; }
      .lockBtns button { white-space: normal !important; }
    }
  `;

  const onSelectPart = (p: number) => {
    setPart(p);
    const pLocked = !isSubscribed && p > unlockedUntil;
    router.replace(`/episode/${episodeKey}?part=${p}${pLocked ? "" : "&autoplay=1"}`);
  };

  return (
    <main
      className="episodeMain"
      style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 20 }}
    >
      <style>{bounceCSS + mobileCSS}</style>

      <TopBar />

      <h1 style={{ marginTop: 14 }}>
        {episodeKey}화 - {part}편
      </h1>

      <div
        className="episodeGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 14,
          marginTop: 14,
        }}
      >
        <aside
          className="episodeAside"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 12,
            height: "fit-content",
            position: "sticky",
            top: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {isSubscribed ? "구독중" : `무료 1~${FREE_PARTS}편`}
              {entBusy && <span style={{ marginLeft: 8, opacity: 0.7 }}>불러오는 중...</span>}
            </div>
          </div>

          <div
            className="partGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 2,
              alignItems: "stretch",
              width: "100%",
              maxWidth: 620,
            }}
          >
            {Array.from({ length: TOTAL_PARTS }).map((_, i) => {
              const p = i + 1;
              const isLocked = !isSubscribed && p > unlockedUntil;
              const isActive = p === part;

              return (
                <button
                  key={p}
                  onClick={() => onSelectPart(p)}
                  style={{
                    height: 33,
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    border: isActive
                      ? "2px solid rgba(255,215,120,0.9)"
                      : "1px solid rgba(255,255,255,0.18)",
                    background: isLocked ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.25)",
                    color: isLocked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.92)",
                    fontWeight: isActive ? 900 : 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    boxShadow: isActive ? "0 0 10px rgba(255,215,120,0.35)" : "none",
                  }}
                  aria-label={`${p}편`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{p}</span>
                    {isLocked && <span style={{ fontSize: 12, lineHeight: 1 }}>🔒</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
            잠긴 편(무료 이후)은 구독/포인트/광고로 오픈됩니다.
            <br />
            포인트는 <b>{POINTS_PER_PART}P당 1편</b> 해제됩니다.
          </div>
        </aside>

        <section style={{ borderRadius: 14, padding: 14, minHeight: 320 }}>
          {/* ✅ 이미지 영역: 잠긴 편이어도 보이게 */}
          <div
            style={{
              marginBottom: 14,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <img
              src={currentImageSrc}
              alt={`${episodeKey}화 ${part}편 이미지`}
              onError={() => {
                if (imageErrorCount < imageCandidates.length) {
                  setImageErrorCount((prev) => prev + 1);
                  setImageIndex((prev) => Math.min(prev + 1, imageCandidates.length - 1));
                }
              }}
              style={{
                width: "100%",
                display: "block",
                maxHeight: 560,
                objectFit: "contain",
                background: "#111",
              }}
            />
          </div>

          {!locked && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={playNow}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ▶ 바로 재생
                </button>

                <button
                  onClick={pauseNow}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "transparent",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ⏸ 일시정지
                </button>

                <button
                  onClick={goPrevPart}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ← 이전편
                </button>

                <button
                  onClick={goNextPart}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.10)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  다음편 →
                </button>

                <span style={{ alignSelf: "center", opacity: 0.85 }}>{status}</span>
              </div>

              <audio
                key={`${episodeKey}-${part}`}
                ref={audioRef}
                src={audioSrc!}
                controls
                preload="auto"
                style={{ width: "100%", marginTop: 12 }}
                onPlay={() => setStatus("재생 중")}
                onPause={() => setStatus("일시정지")}
                onError={() => setStatus(`오디오 로드 실패: ${audioSrc}`)}
                onEnded={() => {
                  setStatus("다음으로 넘어가는 중...");
                  goNextPart();
                }}
                onTimeUpdate={onTimeUpdate}
              />

              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.05)",
                  minHeight: 72,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  자막: {captionStatus || "대기"}
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {caption || " "}
                </div>
              </div>
            </>
          )}

          {locked && (
            <div className="lockWrap" style={{ minHeight: 300, display: "grid", placeItems: "center", padding: 10 }}>
              <div
                className="lockCard"
                style={{
                  width: "min(420px, 84vw)",
                  borderRadius: 24,
                  padding: 22,
                  animation: "bounceIn 520ms ease-out both",
                  background:
                    "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
                  border: "1px solid rgba(255,215,120,0.9)",
                  boxShadow: "0 0 22px rgba(255,215,120,0.55), 0 0 120px rgba(255,200,80,0.25)",
                  color: "#2b1d00",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 900, opacity: 0.85 }}>잠금 편</div>

                <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>
                  {episodeKey}화 {part}편은 잠겨 있어요
                </div>

                <div style={{ marginTop: 10, fontSize: 15, fontWeight: 850, opacity: 0.92 }}>
                  무료 이후 파트는 구독 또는 포인트 또는 광고시청이 필요합니다.
                </div>

                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  보유 포인트: <b>{points}P</b> · ({POINTS_PER_PART}P당 1편 해제)
                </div>

                <div style={{ height: 14 }} />

                <div className="lockBtns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={unlockWithPoints}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(255,255,255,0.75)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    포인트 {POINTS_PER_PART}로 1편 오픈
                  </button>

                  <button
                    onClick={unlockAllParts}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(0,0,0,0.10)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    광고로 전체 오픈
                  </button>

                  <button
                    onClick={() => alert("월 구독은 준비 중입니다!")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(255,255,255,0.55)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    월 구독하기(준비중)
                  </button>

                  <button
                    onClick={() => router.push("/points")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(255,255,255,0.75)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    포인트 충전하기
                  </button>
                </div>

                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
                  ※ 이제부터 포인트/오픈은 DB 기준입니다. (클라 조작으로 풀리지 않아요)
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}