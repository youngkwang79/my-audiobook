"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
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

// -------------------------
// ✅ UnlockedUntil (에피소드별)
// -------------------------
const getUnlockedPartUntil = (episodeKey: string) => {
  const total = getTotalParts(episodeKey);
  const free = getFreeParts(episodeKey);

  if (typeof window === "undefined") return free;

  const v = Number(localStorage.getItem(`unlockedPartUntil:${episodeKey}`) || free);
  if (!Number.isFinite(v)) return free;

  return Math.max(free, Math.min(total, v));
};

const setUnlockedPartUntil = (episodeKey: string, n: number) => {
  const total = getTotalParts(episodeKey);
  const free = getFreeParts(episodeKey);

  if (typeof window === "undefined") return;
  const safe = Math.max(free, Math.min(total, n));
  localStorage.setItem(`unlockedPartUntil:${episodeKey}`, String(safe));
};

// -------------------------
// ✅ 구독 여부 (테스트용)
// -------------------------
const getIsSubscribed = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isSubscribed") === "true";
};

// -------------------------
// ✅ 포인트 (로컬스토리지 기반)
// -------------------------
const getPoints = () => {
  if (typeof window === "undefined") return 0;
  const v = Number(localStorage.getItem("points") || 0);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
};

const setPoints = (p: number) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("points", String(Math.max(0, p)));
};

// ✅ 숫자 화의 마지막 번호(자동 다음화 이동 안전장치)
const LAST_NUM_EPISODE = Math.max(
  ...Object.keys(EPISODE_TOTAL_PARTS)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => Number(k))
);

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
    isNavigatingRef.current = false; // 화가 바뀌면 초기화
  }, [episodeKey]);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [unlockedUntil, setUnlockedUntilState] = useState(FREE_PARTS);

  // ✅ 포인트 상태(화면 표시용)
  const [points, setPointsState] = useState(0);

  // ✅ 현재 선택된 “편(파트)”
  const [part, setPart] = useState(1);
  const [status, setStatus] = useState("");

  // ✅ 마지막 재생 저장
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

  // ✅ 초기 로드: URL part 기준으로 시작
  useEffect(() => {
    setIsSubscribed(getIsSubscribed());
    setUnlockedUntilState(getUnlockedPartUntil(episodeKey));
    setPointsState(getPoints());

    const p = Number(searchParams.get("part") || 1);
    const safeP = Math.max(1, Math.min(TOTAL_PARTS, Number.isFinite(p) ? p : 1));
    setPart(safeP);
  }, [episodeKey, searchParams, TOTAL_PARTS]);

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

  // ✅ 오디오 경로 (R2 사용)
  const audioSrc = !locked ? getR2AudioUrl(episodeKey, part) : null;

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

  // ✅✅✅ 마지막 편이면 다음 화 1편으로 자동 이동 + 자동재생
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

  // ✅ 광고/포인트/구독 “테스트용 오픈”
  const unlockMoreParts = (count: number) => {
    const base = getUnlockedPartUntil(episodeKey);
    const next = Math.max(base, Math.min(TOTAL_PARTS, part + count));
    setUnlockedPartUntil(episodeKey, next);
    setUnlockedUntilState(next);

    router.replace(`/episode/${episodeKey}?part=${part}&autoplay=1`);
  };

  const unlockAllParts = () => {
    setUnlockedPartUntil(episodeKey, TOTAL_PARTS);
    setUnlockedUntilState(TOTAL_PARTS);
    router.replace(`/episode/${episodeKey}?part=${part}&autoplay=1`);
  };

  // ✅ 포인트 60으로 1편 해제
  const unlockWithPoints = () => {
    const current = getPoints();

    if (current < POINTS_PER_PART) {
      alert(`포인트가 부족합니다. (${POINTS_PER_PART}포인트 필요)`);
      return;
    }

    const base = getUnlockedPartUntil(episodeKey);
    const next = Math.min(TOTAL_PARTS, base + 1);

    setUnlockedPartUntil(episodeKey, next);
    setUnlockedUntilState(next);

    const left = current - POINTS_PER_PART;
    setPoints(left);
    setPointsState(left);

    router.replace(`/episode/${episodeKey}?part=${part}&autoplay=1`);
  };

  // ✅ 테스트용: 포인트 지급(남겨둠 - 다른 기능 유지)
  const addTestPoints = (amount: number) => {
    const current = getPoints();
    const next = current + amount;
    setPoints(next);
    setPointsState(next);
    alert(`테스트용 포인트 ${amount} 지급! (현재 ${next}P)`);
  };

  // UI: 바운스
  const bounceCSS = `
    @keyframes bounceIn {
      0% { transform: scale(0.95); opacity: 0; }
      60% { transform: scale(1.02); opacity: 1; }
      100% { transform: scale(1); }
    }
  `;

  // ✅ 모바일 UI 개선: 1열 레이아웃 + 하단 고정 플레이어 + 잠금팝업(안 잘리게)
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

    /* ✅ 잠금 팝업이 모바일에서 잘리지 않게 */
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
        /* ✅ 가로(옆) 넘침 방지 추가 */
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
            </div>
          </div>

          <div
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
              />
            </>
          )}

          {locked && (
            <div
              className="lockWrap"
              style={{ minHeight: 300, display: "grid", placeItems: "center", padding: 10 }}
            >
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
                  boxShadow:
                    "0 0 22px rgba(255,215,120,0.55), 0 0 120px rgba(255,200,80,0.25)",
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

                {/* ✅ 버튼 4개만 */}
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

                {/* ✅ 테스트 포인트 버튼은 “유지”하되, UI에는 안 보이게 숨김(기능 유실 방지용) */}
                <div style={{ display: "none" }}>
                  <button onClick={() => addTestPoints(500)}>포인트 500 지급(테스트)</button>
                </div>

                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
                  ※ 지금은 테스트용(로컬스토리지) 포인트/오픈입니다.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
