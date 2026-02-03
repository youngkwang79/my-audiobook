"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

// ✅ 기본값: 아직 파트 수 확정 안 된 화는 일단 30으로
const DEFAULT_TOTAL_PARTS = 30;

// ✅ 무료 파트 기준(원래 1~8 무료)
const DEFAULT_FREE_PARTS = 8;

// ✅ 포인트 정책: 100포인트당 1편 해제
const POINTS_PER_PART = 100;

// ✅ 작품/파일명 프리픽스
const SERIES_PREFIX = "cheonmujin";

// ✅ 화별 파트 수(분량) 설정: 지금은 1화만 4파트
const EPISODE_TOTAL_PARTS: Record<number, number> = {
  1: 4,
  2: 6, // ✅ 2화는 오디오 6개
    //   // 3: 12,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function getTotalParts(episodeId: number) {
  return EPISODE_TOTAL_PARTS[episodeId] ?? DEFAULT_TOTAL_PARTS;
}

function getFreeParts(episodeId: number) {
  // 총 파트가 8보다 적으면 그 화는 전부 무료로 처리
  return Math.min(DEFAULT_FREE_PARTS, getTotalParts(episodeId));
}

// ✅ 오디오 파일명 생성: cheonmujin_001_01.mp3
function getAudioPath(episodeId: number, part: number) {
  const ep = pad3(episodeId);
  const pt = pad2(part);
  return `/audio/${SERIES_PREFIX}_${ep}_${pt}.mp3`;
}

// -------------------------
// ✅ UnlockedUntil (에피소드별)
// -------------------------
const getUnlockedPartUntil = (episodeId: number) => {
  const total = getTotalParts(episodeId);
  const free = getFreeParts(episodeId);

  if (typeof window === "undefined") return free;

  const v = Number(localStorage.getItem(`unlockedPartUntil:${episodeId}`) || free);
  if (!Number.isFinite(v)) return free;

  return Math.max(free, Math.min(total, v));
};

const setUnlockedPartUntil = (episodeId: number, n: number) => {
  const total = getTotalParts(episodeId);
  const free = getFreeParts(episodeId);

  if (typeof window === "undefined") return;
  const safe = Math.max(free, Math.min(total, n));
  localStorage.setItem(`unlockedPartUntil:${episodeId}`, String(safe));
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

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const episodeId = Number(params.id);
  const autoplay = searchParams.get("autoplay") === "1";

  // ✅ 이 화의 총 파트/무료 파트
  const TOTAL_PARTS = useMemo(() => getTotalParts(episodeId), [episodeId]);
  const FREE_PARTS = useMemo(() => getFreeParts(episodeId), [episodeId]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [unlockedUntil, setUnlockedUntilState] = useState(FREE_PARTS);

  // ✅ 포인트 상태(화면 표시용)
  const [points, setPointsState] = useState(0);

  // ✅ 현재 선택된 “편(파트)”
  const [part, setPart] = useState(1);
  const [status, setStatus] = useState("");

  // ✅ 마지막 재생 저장
  useEffect(() => {
    if (!Number.isFinite(episodeId)) return;
    if (!Number.isFinite(part)) return;

    localStorage.setItem(
      "lastPlayed",
      JSON.stringify({
        episodeId,
        part,
        updatedAt: Date.now(),
      })
    );
  }, [episodeId, part]);

  // ✅ 초기 로드: URL part 기준으로 시작 (오디오 재생 안정화 핵심)
  useEffect(() => {
    setIsSubscribed(getIsSubscribed());
    setUnlockedUntilState(getUnlockedPartUntil(episodeId));
    setPointsState(getPoints());

    const p = Number(searchParams.get("part") || 1);
    const safeP = Math.max(1, Math.min(TOTAL_PARTS, Number.isFinite(p) ? p : 1));
    setPart(safeP);
  }, [episodeId, searchParams, TOTAL_PARTS]);

  // ✅ 잠금 여부: 구독이면 항상 false
  const locked = useMemo(() => {
    if (isSubscribed) return false;
    return part > unlockedUntil;
  }, [part, unlockedUntil, isSubscribed]);

  const R2_BASE = "https://pub-593ff1dc4440464cb156da505f73a555.r2.dev";

const getR2AudioUrl = (episodeId: number, part: number) => {
  return `${R2_BASE}/${pad3(episodeId)}/${pad2(part)}.MP3`;
};
  // ✅ 오디오 경로 (파일명 규칙 반영)
  const audioSrc = !locked ? getR2AudioUrl(episodeId, part) : null;

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
  }, [autoplay, locked, episodeId, part]);

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

  const goNextPart = () => {
    if (part >= TOTAL_PARTS) {
      setStatus("이 화의 마지막 편입니다.");
      return;
    }
    const next = part + 1;
    setPart(next);

    const nextLocked = !isSubscribed && next > unlockedUntil;
    router.replace(`/episode/${episodeId}?part=${next}${nextLocked ? "" : "&autoplay=1"}`);
  };

  const goPrevPart = () => {
    const prev = Math.max(1, part - 1);
    setPart(prev);

    const prevLocked = !isSubscribed && prev > unlockedUntil;
    router.replace(`/episode/${episodeId}?part=${prev}${prevLocked ? "" : "&autoplay=1"}`);
  };

  // ✅ 광고/포인트/구독 “테스트용 오픈”
  const unlockMoreParts = (count: number) => {
    const base = getUnlockedPartUntil(episodeId);
    const next = Math.max(base, Math.min(TOTAL_PARTS, part + count));
    setUnlockedPartUntil(episodeId, next);
    setUnlockedUntilState(next);

    // 오픈 직후 자동재생으로 재진입(현재 part 유지)
    router.replace(`/episode/${episodeId}?part=${part}&autoplay=1`);
  };

  const unlockAllParts = () => {
    setUnlockedPartUntil(episodeId, TOTAL_PARTS);
    setUnlockedUntilState(TOTAL_PARTS);
    router.replace(`/episode/${episodeId}?part=${part}&autoplay=1`);
  };

  // ✅ 포인트 100으로 1편 해제
  const unlockWithPoints = () => {
    const current = getPoints();

    if (current < POINTS_PER_PART) {
      alert(`포인트가 부족합니다. (${POINTS_PER_PART}포인트 필요)`);
      return;
    }

    const base = getUnlockedPartUntil(episodeId);
    const next = Math.min(TOTAL_PARTS, base + 1);

    setUnlockedPartUntil(episodeId, next);
    setUnlockedUntilState(next);

    const left = current - POINTS_PER_PART;
    setPoints(left);
    setPointsState(left);

    router.replace(`/episode/${episodeId}?part=${part}&autoplay=1`);
  };

  // ✅ 테스트용: 포인트 지급
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

  /* ✅ 홈 로그인 버튼과 동일한 금빛 스윕 효과 */
  @keyframes lightSweep {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(120%); }
  }
`;
// ✅ 모바일 UI 개선: 1열 레이아웃 + 하단 고정 플레이어
const mobileCSS = `
  @media (max-width: 820px) {
    .episodeMain {
      padding-bottom: 120px !important; /* 하단 플레이어에 가리지 않게 */
    }

    .episodeGrid {
      grid-template-columns: 1fr !important; /* 2열 -> 1열 */
    }

    .episodeAside {
      position: static !important; /* sticky 해제 */
      top: auto !important;
    }

    .audioDock {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
      background: rgba(10, 10, 18, 0.92);
      border-top: 1px solid rgba(255,255,255,0.10);
      backdrop-filter: blur(10px);
    }

    .audioDock audio {
      width: 100% !important;
      margin-top: 0 !important;
    }
  }
`;

  const onSelectPart = (p: number) => {
    setPart(p);
    const pLocked = !isSubscribed && p > unlockedUntil;
    router.replace(`/episode/${episodeId}?part=${p}${pLocked ? "" : "&autoplay=1"}`);
  };

  return (
    <main
  className="episodeMain"
  style={{ minHeight: "100vh", background: "#0b0b12", color: "white", padding: 20 }}
>
      <style>{bounceCSS + mobileCSS}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/work/cheonmujin" style={{ color: "white", textDecoration: "none" }}>
          ← 이전
        </Link>

        <div style={{ fontSize: 13, opacity: 0.8, display: "flex", gap: 12, alignItems: "center" }}>
  <div
  style={{
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
    color: "#2b1d00",
    border: "1px solid rgba(255,215,120,0.65)",
    padding: "10px 18px",
    borderRadius: 14,
    boxShadow: "0 0 14px rgba(255,215,120,0.45), 0 0 50px rgba(255,200,80,0.25)",
    minWidth: 140,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1.1,
  }}
>
  {/* 🔹 보조 텍스트 */}
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      opacity: 0.85,
      letterSpacing: 0.5,
      marginBottom: 4,
    }}
  >
    보유 포인트
  </div>

  {/* 🔸 핵심 숫자 */}
  <div
    style={{
      fontSize: 28,
      fontWeight: 900,
      letterSpacing: 0.8,
    }}
  >
    {points}P
  </div>

  {/* ✨ 황금빛 스윕 효과 */}
  <span
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "60%",
      height: "100%",
      background:
        "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)",
      transform: "translateX(-120%)",
      animation: "lightSweep 1.2s ease infinite",
      pointerEvents: "none",
    }}
  />
</div>

        </div>
      </div>

      <h1 style={{ marginTop: 14 }}>
        {episodeId}화 - {part}편
      </h1>

      {/* 레이아웃: 왼쪽 리스트(그리드) + 오른쪽 플레이어 */}
      <div
  className="episodeGrid"
  style={{
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 14,
    marginTop: 14,
  }}
>
        
        {/* ✅ 편 리스트 */}
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

          {/* ✅ 그리드 (10열: 10개 단위 줄바꿈) */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
    gap: 5,
    alignItems: "stretch",
    width: "100%",
    maxWidth: 520, // 너무 길면 줄바꿈이 이상해질 수 있어 상한을 둠(원하면 숫자 키우기)
  }}
>
  {Array.from({ length: TOTAL_PARTS }).map((_, i) => {
    const p = i + 1;
    const locked = !isSubscribed && p > unlockedUntil;
    const isActive = p === part;

    return (
      <button
        key={p}
        onClick={() => onSelectPart(p)}
        style={{
          height: 33,                // ✅ 정사각형을 “확실히” 만들기 위한 기준
          aspectRatio: "1 / 1",      // ✅ 브라우저가 지원하면 더 안정적
          borderRadius: 12,
          border: isActive
            ? "2px solid rgba(255,215,120,0.9)"
            : "1px solid rgba(255,255,255,0.18)",
          background: locked
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.25)",
          color: locked ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.92)",
          fontWeight: isActive ? 900 : 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: locked ? "not-allowed" : "pointer",
          boxShadow: isActive ? "0 0 10px rgba(255,215,120,0.35)" : "none",
        }}
        disabled={locked}
        aria-label={`${p}편`}
      >
        {p}
      </button>
    );
  })}
</div>


          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
            잠긴 편(무료 이후)은 구독/포인트/광고로 오픈됩니다.
            <br />
            포인트는 <b>100P당 1편</b> 해제됩니다.
          </div>
        </aside>

        {/* 플레이어 영역 */}
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 14,
            minHeight: 320,
          }}
        >
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
                key={`${episodeId}-${part}`} // ✅ part 바뀔 때 오디오 강제 리로드
                ref={audioRef}
                src={audioSrc!}
                controls
                preload="auto"
                style={{ width: "100%", marginTop: 12 }}
                onPlay={() => setStatus("재생 중")}
                onPause={() => setStatus("일시정지")}
                onError={() =>
                  setStatus(`오디오 로드 실패: ${audioSrc} (public/audio에 파일 있는지 확인)`)
                }
                onEnded={() => {
                  setStatus("다음 편으로 넘어가는 중...");
                  goNextPart();
                }}
              />
            </>
          )}

          {/* 잠금 오버레이 */}
          {locked && (
            <div style={{ minHeight: 300, display: "grid", placeItems: "center", padding: 10 }}>
              <div
                style={{
                  width: "min(720px, 94vw)",
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
                <div style={{ fontSize: 14, fontWeight: 900, opacity: 0.85 }}>🔒 잠금 편</div>

                <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>
                  {episodeId}화 {part}편은 잠겨 있어요
                </div>

                <div style={{ marginTop: 10, fontSize: 15, fontWeight: 850, opacity: 0.92 }}>
                  무료 이후 파트는 구독 또는 포인트 또는 광고시청이 필요합니다.
                </div>
              
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  보유 포인트: <b>{points}P</b> · (100P당 1편 해제)
                </div>

                <div style={{ height: 14 }} />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                    💰 포인트 100으로 1편 해제
                  </button>

                  <button
                    onClick={() => unlockMoreParts(1)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(255,255,255,0.35)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    간단 광고로 1편 오픈
                  </button>

                  <button
                    onClick={() => unlockMoreParts(5)}
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
                    광고 참여로 5편 연속 오픈
                  </button>

                  <button
                    onClick={unlockAllParts}
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
                    🔥 프리미엄 광고로 이 화 전편 오픈
                  </button>

                  <button
                    onClick={() => alert("구독 결제 연결은 다음 단계에서 붙일게요!")}
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
                    월 구독하기
                  </button>

                  <button
                    onClick={() => addTestPoints(500)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(43,29,0,0.25)",
                      background: "rgba(0,0,0,0.18)",
                      color: "#2b1d00",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    🧪 포인트 500 지급(테스트)
                  </button>
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
