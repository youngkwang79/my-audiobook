"use client";

import { works } from "@/app/data/works";
import { getEpisodesByWork, getTotalPartsByWork } from "@/app/data/episodes";
import TopBar from "@/app/components/TopBar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Comments from "@/app/components/Comments";

const DEFAULT_FREE_PARTS = 8;
const POINTS_PER_PART = 60;

const AUDIO_EXTENSIONS = ["MP3", "mp3", "WAV", "wav", "M4A", "m4a"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

type EntitlementPayload = {
  points: number;
  is_subscribed: boolean;
  unlocked_until_part: number | null;
};

type Segment = {
  start: number;
  end: number;
  text: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function getEpisodeFolder(episodeKey: string) {
  if (/^\d+$/.test(episodeKey)) return pad3(Number(episodeKey));
  const m = episodeKey.match(/^(\d+)-(.*)$/);
  if (!m) return episodeKey;
  return `${pad3(Number(m[1]))}-${m[2]}`;
}

function getFreeParts(workId: string, episodeKey: string) {
  return Math.min(DEFAULT_FREE_PARTS, getTotalPartsByWork(workId, episodeKey));
}

function lockedMemo(isSubscribed: boolean, part: number, unlockedUntil: number) {
  if (isSubscribed) return false;
  return part > unlockedUntil;
}

function DownloadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

async function getAccessToken() {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return null;
  return session?.access_token ?? null;
}

async function fetchEntitlement(workId: string, episodeKey: string): Promise<EntitlementPayload> {
  const token = await getAccessToken();

  if (!token) {
    return {
      points: 0,
      is_subscribed: false,
      unlocked_until_part: null,
    };
  }

  const qs = new URLSearchParams({
    work_id: workId,
    episode_id: episodeKey,
  });

  const res = await fetch(`/api/me/entitlements?${qs.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("entitlement fetch 실패");
  }

  return await res.json();
}

function formatTime(sec: number) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
      .filter(
        (s: Segment) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.text.trim().length > 0
      );
  }

  const text = aiResp?.text;
  if (typeof text === "string" && text.trim()) {
    return [{ start: 0, end: 999999, text }];
  }

  return [];
}

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const workId = String((params as any).workId);
  const episodeKey = String((params as any).id);

  const work = works.find((w) => w.id === workId);
  const episodes = useMemo(() => getEpisodesByWork(workId), [workId]);
  const currentEpisode = useMemo(
    () => episodes.find((ep) => String(ep.id) === episodeKey),
    [episodes, episodeKey]
  );
  const workThumbnail = work?.thumbnail ?? "/thumbnails/cheonmujin.jpg";

  const SERIES_PREFIX = workId;
  const WORK_THUMBNAIL = workThumbnail;
  const autoplay = searchParams.get("autoplay") === "1";

  const TOTAL_PARTS = useMemo(
    () => getTotalPartsByWork(workId, episodeKey),
    [workId, episodeKey]
  );

  const FREE_PARTS = useMemo(
    () => getFreeParts(workId, episodeKey),
    [workId, episodeKey]
  );

  const currentEpisodeIndex = useMemo(
    () => episodes.findIndex((ep) => String(ep.id) === episodeKey),
    [episodes, episodeKey]
  );

  const [captionFontSize, setCaptionFontSize] = useState(32);
  const [showPartList, setShowPartList] = useState(false);
  const [showPartMenuCinema, setShowPartMenuCinema] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showCinemaComments, setShowCinemaComments] = useState(false);
  const [playerLandscapeMode, setPlayerLandscapeMode] = useState(false);
  const [autoUnlockBusy, setAutoUnlockBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoEnteredCinema, setAutoEnteredCinema] = useState(false);

  const [isFavorited, setIsFavorited] = useState(false);
  const [showDescriptionPopup, setShowDescriptionPopup] = useState(false);
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<"story" | "episodes">("episodes");
  const [activeRangeIndex, setActiveRangeIndex] = useState(0);

  useEffect(() => {
    try {
      const fav = localStorage.getItem(`fav:${workId}`) === "true";
      setIsFavorited(fav);
    } catch {}
  }, [workId]);

  const toggleFavorite = () => {
    try {
      const next = !isFavorited;
      setIsFavorited(next);
      localStorage.setItem(`fav:${workId}`, String(next));
    } catch {}
  };

  const handleShare = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert("공유 링크가 클립보드에 복사되었습니다!");
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  const cinemaFont =
    '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif';

  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [resumeTime, setResumeTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashType, setFlashType] = useState<"play" | "pause">("play");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlayerUi, setShowPlayerUi] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);
  const segIndexRef = useRef(0);
  const pendingAutoplayRef = useRef(false);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [unlockedUntil, setUnlockedUntilState] = useState(FREE_PARTS);
  const [points, setPointsState] = useState(0);

  const [part, setPart] = useState(1);
  const [status, setStatus] = useState("");
  const [entBusy, setEntBusy] = useState(false);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");

  const [signedAudioSrc, setSignedAudioSrc] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const R2_BASE = "https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev";
  const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

  // 출석체크 미션(시청 타이머) 및 라우팅을 위한 저장
  useEffect(() => {
    try {
      localStorage.setItem(
        "last_played_episode",
        JSON.stringify({ workId, episodeId: episodeKey, part })
      );
    } catch (e) {}
  }, [workId, episodeKey, part]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      try {
        const todayStr = new Date().toDateString();
        const key = `watch_time_${todayStr}`;
        const current = Number(localStorage.getItem(key) || 0);
        localStorage.setItem(key, String(current + 1));
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const locked = useMemo(() => {
    if (isSubscribed) return false;
    return part > unlockedUntil;
  }, [isSubscribed, part, unlockedUntil]);

  useEffect(() => {
    if (locked) {
      setSignedAudioSrc(null);
      return;
    }

    let isMounted = true;
    const fetchSignedUrl = async () => {
      setIsSigning(true);
      setSignedAudioSrc(null);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/media/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ workId, episodeId: episodeKey, part })
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.url) {
            setSignedAudioSrc(data.url);
          }
        } else {
          console.error("오디오 파일을 찾을 수 없거나 권한이 없습니다.");
        }
      } catch (err) {
        console.error("Signed URL 발급 실패:", err);
      } finally {
        if (isMounted) setIsSigning(false);
      }
    };

    fetchSignedUrl();

    return () => { isMounted = false; };
  }, [locked, workId, episodeKey, part]);



  const getWorkerUrl = (episodeKeyValue: string, partValue: number) =>
    `${WORKER_BASE}/?workId=${encodeURIComponent(SERIES_PREFIX)}&episode=${encodeURIComponent(
      episodeKeyValue
    )}&part=${encodeURIComponent(String(partValue))}`;



  const audioSrc = signedAudioSrc;

  // 에피소드별 개별 이미지를 사용하지 않고 작품의 기본 썸네일을 배경으로 고정 사용
  const currentImageSrc = WORK_THUMBNAIL;

  const handleDownload = async () => {
    if (!isSubscribed) {
      alert("무제한 다운로드는 멤버십 회원 전용 혜택입니다.");
      router.push("/membership");
      return;
    }
    if (!audioSrc) {
      alert("다운로드할 음원이 아직 준비되지 않았습니다.");
      return;
    }

    try {
      alert("다운로드를 시작합니다...");
      const res = await fetch(audioSrc, { cache: "no-store" });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workId}_${episodeKey}_part${part}.m4a`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // 다운로드 기록 서버 전송
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/me/downloads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ workId, episodeId: episodeKey, part })
          });
        }
      } catch (err) {
        console.error("다운로드 기록 저장 실패:", err);
      }
    } catch (e) {
      console.error(e);
      alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    isNavigatingRef.current = false;
  }, [episodeKey]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 820);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!workId || !episodeKey) return;
    if (!Number.isFinite(part)) return;

    try {
      localStorage.setItem(
        "lastPlayed",
        JSON.stringify({
          workId,
          episodeId: episodeKey,
          part,
          updatedAt: Date.now(),
        })
      );

      // 개별 작품별 시청한 마지막 에피소드 저장
      const progressRaw = localStorage.getItem("workProgress");
      const progress = progressRaw ? JSON.parse(progressRaw) : {};
      progress[workId] = episodeKey;
      localStorage.setItem("workProgress", JSON.stringify(progress));
    } catch { }
  }, [workId, episodeKey, part]);

  useEffect(() => {
    const p = Number(searchParams.get("part") || 1);
    const safeP = Math.max(1, Math.min(TOTAL_PARTS, Number.isFinite(p) ? p : 1));
    setPart(safeP);
  }, [episodeKey, searchParams, TOTAL_PARTS]);

  useEffect(() => {
    let alive = true;
    setEntBusy(true);

    (async () => {
      try {
        const data = await fetchEntitlement(workId, episodeKey);
        if (!alive) return;

        setIsSubscribed(!!data.is_subscribed);

        const serverUnlocked = data.unlocked_until_part ?? FREE_PARTS;
        const safeUnlocked = Math.max(FREE_PARTS, Math.min(TOTAL_PARTS, serverUnlocked));
        setUnlockedUntilState(safeUnlocked);

        setPointsState(Number.isFinite(data.points) ? Math.max(0, data.points) : 0);
      } catch (error) {
        console.error(error);
        if (!alive) return;
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
  }, [workId, episodeKey, FREE_PARTS, TOTAL_PARTS]);



  useEffect(() => {
    let alive = true;

    async function fetchJsonSafe(url: string) {
      const res = await fetch(url, { cache: "no-store" });
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

      let signedCaptionUrl = "";
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/media/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ workId, episodeId: episodeKey, part, type: "caption" })
        });
        if (res.ok) {
          const data = await res.json();
          signedCaptionUrl = data.url;
        }
      } catch (err) {
        console.error("자막 Signed URL 발급 실패:", err);
      }

      if (!signedCaptionUrl) {
        setCaptionStatus("자막을 불러올 수 없거나 생성해야 합니다.");
        // 실패 시 워커를 호출하도록 아래 로직으로 넘기기 위해 임시 빈 주소
      }

      const r2 = signedCaptionUrl ? await fetchJsonSafe(signedCaptionUrl) : { ok: false as const, status: 0, text: "" };
      if (!alive) return;

      if (r2.ok) {
        const parsed = parseSegmentsFromSavedJson(r2.data);
        setSegments(parsed);
        const current = audioRef.current?.currentTime ?? 0;
        updateCaptionByTime(current);
        setCaptionStatus(parsed.length ? "" : "자막 데이터가 비어있어요");
        return;
      }

      setCaptionStatus("자막 생성 중(처음 1회)...");

      const workerRes = await fetch(getWorkerUrl(episodeKey, part), {
        method: "GET",
        cache: "no-store",
      });

      if (!workerRes.ok) {
        if (!alive) return;
        setCaptionStatus("자막 생성 실패(Worker 오류)");
        return;
      }

      const r2b = signedCaptionUrl ? await fetchJsonSafe(signedCaptionUrl) : { ok: false as const, status: 0, text: "" };
      if (!alive) return;

      if (!r2b.ok) {
        const preview = (r2b.text || "").slice(0, 80).replace(/\s+/g, " ");
        setCaptionStatus(`자막 파일 파싱 실패(R2) ${r2b.status}: ${preview}`);
        return;
      }

      const parsed2 = parseSegmentsFromSavedJson(r2b.data);
      if (parsed2.length) {
        setSegments(parsed2);
        const current = audioRef.current?.currentTime ?? 0;
        updateCaptionByTime(current);
        setCaptionStatus(""); // 성공 시 아무것도 안 보여줌
      } else {
        setSegments([]);
        setCaptionStatus("자막 데이터가 비어있어요");
      }
    }

    loadCaptions().catch((error) => {
      if (!alive) return;
      console.error("[caption] load error:", error);
      setCaptionStatus("자막 로드 중 오류");
    });

    return () => {
      alive = false;
    };
  }, [episodeKey, part, locked, workId]);

  const updateCaptionByTime = (t: number) => {
    const segs = segments;
    if (!segs.length) {
      setCaption("");
      return;
    }

    const EARLY_SWITCH = 0.15; // 추천값: 0.12 ~ 0.18

    let i = segIndexRef.current;
    i = Math.max(0, Math.min(i, segs.length - 1));

    while (i < segs.length - 1 && t > segs[i].end) i++;
    while (i > 0 && t < segs[i].start) i--;

    const current = segs[i];
    const next = segs[i + 1];

    // 다음 자막 시작 직전이면 살짝 미리 교체
    if (next && t >= next.start - EARLY_SWITCH && t < next.start) {
      segIndexRef.current = i + 1;
      setCaption(String(next.text || "").trim());
      return;
    }

    // 현재 자막 구간이면 현재 자막 표시
    if (t >= current.start && t <= current.end) {
      segIndexRef.current = i;
      setCaption(String(current.text || "").trim());
      return;
    }

    // 다음 자막도 없고 현재 자막이 끝났으면 비움
    if (!next && t > current.end) {
      setCaption("");
      return;
    }

    // 그 외에는 현재 자막 유지
    segIndexRef.current = i;
    setCaption(String(current.text || "").trim());
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;

    setCurrentTime(a.currentTime || 0);
    updateCaptionByTime(a.currentTime);
  };

  const resetHideTimer = () => {
    setShowPlayerUi(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setShowPlayerUi(false);
    }, 2000);
  };

  const handlePlayerInteraction = () => {
    resetHideTimer();
  };

  useEffect(() => {
    if (locked) return;

    resetHideTimer();

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [locked, episodeKey, part, playerLandscapeMode]);

  useEffect(() => {
    const onUserAction = () => {
      resetHideTimer();
    };

    window.addEventListener("touchstart", onUserAction);
    window.addEventListener("mousemove", onUserAction);
    window.addEventListener("click", onUserAction);

    return () => {
      window.removeEventListener("touchstart", onUserAction);
      window.removeEventListener("mousemove", onUserAction);
      window.removeEventListener("click", onUserAction);
    };
  }, []);

  useEffect(() => {
    if (!autoplay && !pendingAutoplayRef.current) return;
    if (locked) return;

    const t = setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;

      a.play()
        .then(async () => {
          setIsPlaying(true);
          setStatus("재생 중");
          pendingAutoplayRef.current = false;
        })
        .catch(() => {
          setIsPlaying(false);
          setStatus("자동재생이 차단됐어요. 재생 버튼을 한 번 눌러주세요.");
        });
    }, 120);

    return () => clearTimeout(t);
  }, [autoplay, locked, episodeKey, part, audioSrc, isMobile]);

  const enterCinemaMode = async () => {
    setPlayerLandscapeMode(true);
    resetHideTimer();

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch { }
  };

  const exitCinemaMode = async () => {
    setPlayerLandscapeMode(false);
    setShowSpeedMenu(false);
    setShowPartMenuCinema(false);
    setShowCinemaComments(false);

    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch { }
  };

  const toggleLandscapePlayer = async () => {
    if (playerLandscapeMode) {
      await exitCinemaMode();
      return;
    }

    const a = audioRef.current;
    if (a) {
      setResumeTime(a.currentTime || 0);
    }

    await enterCinemaMode();
  };

  const togglePlayPause = async () => {
    const a = audioRef.current;
    if (!a) return;

    try {
      if (a.paused) {
        await a.play();
        setIsPlaying(true);
        setFlashType("play");
      } else {
        a.pause();
        setIsPlaying(false);
        setFlashType("pause");
      }
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
      }, 800);
    } catch { }

    resetHideTimer();
  };

  const seekBy = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;

    const next = Math.max(0, Math.min(a.duration || 0, (a.currentTime || 0) + delta));
    a.currentTime = next;
    setCurrentTime(next);
    updateCaptionByTime(next);
    resetHideTimer();
  };

  const handleSeek = (value: number) => {
    const a = audioRef.current;
    if (!a) return;

    a.currentTime = value;
    setCurrentTime(value);
    updateCaptionByTime(value);
    resetHideTimer();
  };

  const changePlaybackRate = (rate: number) => {
    const a = audioRef.current;
    if (!a) return;

    a.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    resetHideTimer();
  };

  const handleVolumeChange = (value: number) => {
    const a = audioRef.current;
    if (!a) return;

    a.volume = value;
    setVolume(value);
    resetHideTimer();
  };

  const goNextEpisode = async () => {
    if (isNavigatingRef.current) return;

    if (currentEpisodeIndex < 0) {
      setStatus("현재 화 정보를 찾을 수 없습니다.");
      return;
    }

    const nextEpisode = episodes[currentEpisodeIndex + 1];
    if (!nextEpisode) {
      setStatus("마지막 화입니다.");
      return;
    }

    isNavigatingRef.current = true;
    const nextEpisodeKey = String(nextEpisode.id);

    try {
      const token = await getAccessToken();

      if (!token) {
        router.replace(`/episode/${workId}/${nextEpisodeKey}?part=1`);
        return;
      }

      const qs = new URLSearchParams({
        work_id: SERIES_PREFIX,
        episode_id: nextEpisodeKey,
      });

      const res = await fetch(`/api/me/entitlements?${qs.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      const nextUnlockedUntil = Number(data?.unlocked_until_part ?? 0);
      const nextPoints = Number(data?.points ?? points);
      const nextLocked = !Boolean(data?.is_subscribed) && 1 > nextUnlockedUntil;

      if (!nextLocked) {
        pendingAutoplayRef.current = true;
        router.replace(`/episode/${workId}/${nextEpisodeKey}?part=1&autoplay=1`);
        return;
      }

      if (nextPoints >= POINTS_PER_PART) {
        setStatus(`다음 화 1편이 잠겨 있어 ${POINTS_PER_PART}P로 자동 오픈 중...`);

        const unlockRes = await fetch("/api/unlock/with-points", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            work_id: SERIES_PREFIX,
            episode_id: nextEpisodeKey,
            target_unlock_until_part: 1,
          }),
        });

        const unlockData = await unlockRes.json().catch(() => null);

        if (unlockRes.ok) {
          const nextPointBalance = Number(unlockData?.points_left ?? nextPoints);

          try {
            localStorage.setItem("points", String(nextPointBalance));
          } catch { }

          window.dispatchEvent(new Event("wallet-updated"));
          pendingAutoplayRef.current = true;
          router.replace(`/episode/${workId}/${nextEpisodeKey}?part=1&autoplay=1`);
          return;
        }
      }

      router.replace(`/episode/${workId}/${nextEpisodeKey}?part=1`);
    } finally {
      isNavigatingRef.current = false;
    }
  };

  const unlockWithPoints = async (targetPart = part) => {
    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인이 필요합니다.");
        router.push(`/login?redirect=/episode/${workId}/${episodeKey}?part=${targetPart}`);
        return false;
      }

      const res = await fetch("/api/unlock/with-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          work_id: SERIES_PREFIX,
          episode_id: episodeKey,
          target_unlock_until_part: targetPart,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === "not_enough_points") {
          alert(`포인트가 부족합니다. (${data?.need ?? POINTS_PER_PART}포인트 필요)`);
          return false;
        }

        if (data?.error === "unauthorized") {
          alert("로그인이 필요합니다.");
          router.push(`/login?redirect=/episode/${workId}/${episodeKey}?part=${targetPart}`);
          return false;
        }

        if (data?.error === "invalid_target") {
          alert("이미 열렸거나 순서가 맞지 않습니다. 새로고침 후 다시 시도해주세요.");
          return false;
        }

        alert(`오류가 발생했습니다. (${data?.error ?? "unknown_error"})`);
        return false;
      }

      const nextPoints = Number(data?.points_left ?? points);
      const nextUnlocked = Number(data?.unlocked_until_part ?? unlockedUntil);

      setPointsState(nextPoints);
      setUnlockedUntilState(nextUnlocked);
      setPart(targetPart);
      pendingAutoplayRef.current = true;

      try {
        localStorage.setItem("points", String(nextPoints));
      } catch { }

      window.dispatchEvent(new Event("wallet-updated"));
      router.replace(`/episode/${workId}/${episodeKey}?part=${targetPart}&autoplay=1`);
      return true;
    } catch (error) {
      console.error(error);
      alert("네트워크 오류가 발생했습니다.");
      return false;
    }
  };

  const goNextPart = async () => {
    if (part >= TOTAL_PARTS) {
      setStatus("다음 화로 넘어가는 중...");
      goNextEpisode();
      return;
    }

    const next = part + 1;
    const nextLocked = !isSubscribed && next > unlockedUntil;

    if (!nextLocked) {
      setPart(next);
      pendingAutoplayRef.current = true;
      router.replace(`/episode/${workId}/${episodeKey}?part=${next}&autoplay=1`);
      return;
    }

    if (points >= POINTS_PER_PART && !autoUnlockBusy) {
      setStatus(`다음 편이 잠겨 있어 ${POINTS_PER_PART}P로 자동 오픈 중...`);
      setAutoUnlockBusy(true);

      try {
        const ok = await unlockWithPoints(next);
        if (!ok) {
          setPart(next);
          router.replace(`/episode/${workId}/${episodeKey}?part=${next}`);
        }
      } finally {
        setAutoUnlockBusy(false);
      }
      return;
    }

    setStatus("다음 편은 잠겨 있고 포인트가 부족합니다.");
    setPart(next);
    router.replace(`/episode/${workId}/${episodeKey}?part=${next}`);
  };

  const unlockAllParts = () => {
    alert("광고 리워드(서버 검증) 붙이면 전체 오픈으로 연결됩니다. 지금은 준비중입니다.");
  };

  const onSelectPart = async (p: number) => {
    setShowPartList(false);
    setShowPartMenuCinema(false);
    setPart(p);

    const pLocked = !isSubscribed && p > unlockedUntil;

    if (!pLocked) {
      pendingAutoplayRef.current = true;
      router.replace(`/episode/${workId}/${episodeKey}?part=${p}&autoplay=1`);
      return;
    }

    if (points >= POINTS_PER_PART) {
      const ok = await unlockWithPoints(p);
      if (!ok) {
        router.replace(`/episode/${workId}/${episodeKey}?part=${p}`);
      }
      return;
    }

    router.replace(`/episode/${workId}/${episodeKey}?part=${p}`);
  };

  if (!work) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#0b0b12",
          color: "white",
          padding: 20,
        }}
      >
        <div>존재하지 않는 작품입니다.</div>
      </main>
    );
  }

  return (
    <main
      className="episodeMain"
      style={{
        minHeight: "100dvh",
        background: "#000000",
        color: "white",
        margin: 0,
        padding: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        /* 숏폼 전용 CSS 스타일 */
        .sf-container {
          width: 100%;
          height: 100dvh;
          position: relative;
          background: #000;
          overflow: hidden;
        }
        @media (min-width: 769px) {
          .sf-container {
            max-width: 480px;
            margin: 0 auto;
            border-left: 1px solid rgba(255,255,255,0.1);
            border-right: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 0 40px rgba(0,0,0,0.8);
          }
        }
        
        /* 백그라운드 블러 */
        .sf-blur-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(25px) brightness(0.28);
          transform: scale(1.05);
          z-index: 1;
        }
        .sf-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(0, 0, 0, 0.1) 40%,
            rgba(0, 0, 0, 0.3) 70%,
            rgba(0, 0, 0, 0.82) 100%
          );
          z-index: 2;
        }

        /* 헤더 탑바 */
        .sf-header {
          position: absolute;
          top: calc(14px + env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .sf-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #ffffff;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          padding: 8px 4px;
        }
        .sf-back-btn svg {
          stroke: #ffffff;
        }
        .sf-speed-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 99px;
          color: #ffffff;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(8px);
        }
        .sf-more-btn {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 22px;
          cursor: pointer;
          padding: 6px 10px;
        }

        /* 자막 영역 */
        .sf-caption-container {
          position: absolute;
          left: 20px;
          right: 20px;
          top: 30%;
          bottom: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 5;
          cursor: pointer; /* 클릭 시 재생/정지 */
        }
        .sf-caption-text {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.5;
          color: #ffffff;
          white-space: pre-wrap;
          word-break: keep-all;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95), 0 0 1px rgba(0,0,0,0.5);
          user-select: none;
          max-height: 100%;
          overflow-y: auto;
          padding: 0 10px;
        }
        
        /* 우측 액션 바 */
        .sf-right-bar {
          position: absolute;
          bottom: 190px;
          right: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }
        .sf-action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.2s;
        }
        .sf-action-item:active {
          transform: scale(0.9);
        }
        .sf-action-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
          color: #ffffff;
        }
        .sf-action-item.active .sf-action-icon {
          color: #ffd700;
          border-color: rgba(255, 215, 120, 0.4);
        }
        .sf-action-label {
          font-size: 11px;
          font-weight: 800;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          opacity: 0.95;
        }

        /* 좌측 하단 메타 정보 */
        .sf-meta-left {
          position: absolute;
          bottom: 125px;
          left: 16px;
          right: 76px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }
        .sf-meta-title {
          font-size: 17px;
          font-weight: 900;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8);
        }
        .sf-meta-title svg {
          stroke: #ffffff;
          opacity: 0.8;
        }
        .sf-meta-desc-wrap {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.45;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sf-more-link {
          color: #ffe074;
          font-weight: 800;
          cursor: pointer;
          margin-top: 2px;
          background: none;
          border: none;
          font-size: 13px;
          padding: 0;
          text-align: left;
        }

        /* 하단 타임라인 */
        .sf-timeline {
          position: absolute;
          bottom: 82px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .sf-time-text {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          min-width: 34px;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        .sf-progress-slider {
          flex: 1;
          height: 3px;
          border-radius: 99px;
          accent-color: #ffffff;
          cursor: pointer;
          outline: none;
        }

        /* 맨 하단 액션 버튼 */
        .sf-bottom-bar {
          position: absolute;
          bottom: calc(16px + env(safe-area-inset-bottom));
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          z-index: 10;
        }
        .sf-membership-btn {
          flex: 1;
          height: 44px;
          border-radius: 22px;
          background: linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%);
          border: 1px solid rgba(255, 215, 120, 0.4);
          color: #2b1d00;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(212,162,60,0.25);
        }
        .sf-download-btn {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          opacity: 0.95;
        }
        .sf-download-btn svg {
          fill: #ffffff;
        }

        /* 바텀 시트 및 팝업 모달 */
        .sf-bottom-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #16161a;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          z-index: 100;
          padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
          max-height: 75dvh;
          overflow-y: auto;
          animation: slideUp 0.22s ease-out;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        /* 스와이프 핸들바 */
        .sf-sheet-handle {
          width: 36px;
          height: 4px;
          background: rgba(255,255,255,0.18);
          border-radius: 2px;
          margin: 0 auto 12px auto;
        }

        /* 닫기 헤더 */
        .sf-sheet-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 4px;
        }
        .sf-sheet-close-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.68);
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        /* 작품 정보 영역 */
        .sf-sheet-info {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
          text-align: left;
        }
        .sf-sheet-thumb {
          width: 66px;
          aspect-ratio: 2 / 3;
          border-radius: 8px;
          object-fit: cover;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .sf-sheet-meta {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
        }
        .sf-sheet-meta-title {
          font-size: 17px;
          font-weight: 900;
          color: #ffffff;
        }
        .sf-sheet-meta-views {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }
        .sf-sheet-meta-rating {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          font-weight: 600;
        }

        /* 줄거리 / 회차 탭 */
        .sf-sheet-tabs {
          display: flex;
          gap: 22px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 16px;
        }
        .sf-sheet-tab {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.48);
          padding: 8px 0 10px 0;
          border-bottom: 2px solid transparent;
          cursor: pointer;
        }
        .sf-sheet-tab.active {
          color: #ffffff;
          border-bottom-color: #ffffff;
          font-weight: 900;
        }

        /* 구간 선택 페이징 */
        .sf-sheet-ranges {
          display: flex;
          gap: 18px;
          margin-bottom: 16px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
        }
        .sf-sheet-ranges::-webkit-scrollbar {
          display: none; /* Safari, Chrome */
        }
        .sf-sheet-range-item {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.36);
          cursor: pointer;
          white-space: nowrap;
          padding: 2px 0;
        }
        .sf-sheet-range-item.active {
          color: #ffffff;
          font-weight: 900;
        }

        /* 6열 에피소드 그리드 */
        .sf-episode-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        .sf-episode-cell {
          aspect-ratio: 1;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.85);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
        }
        .sf-episode-cell:active {
          transform: scale(0.92);
        }
        .sf-episode-cell.active {
          background: rgba(255, 215, 120, 0.12);
          border-color: rgba(255, 215, 120, 0.85);
          color: #ffd700;
          font-weight: 900;
        }
        .sf-episode-cell.locked {
          color: rgba(255,255,255,0.34);
        }
        .sf-episode-lock-icon {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 9px;
          color: rgba(255,255,255,0.45);
          line-height: 1;
        }
        .sf-episode-playing-icon {
          font-size: 9px;
          margin-top: 1px;
          color: #ffd700;
        }

        /* 설명 팝업 */
        .sf-popup-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .sf-popup-card {
          width: 100%;
          max-width: 380px;
          background: #1c1c24;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }
        .sf-popup-title {
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .sf-popup-body {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
          line-height: 1.6;
          white-space: pre-wrap;
          margin-bottom: 20px;
        }
        .sf-popup-btn {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #ffffff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        }

        /* 재생 속도 선택 리스트 */
        .sf-speed-list {
          display: flex;
          justify-content: space-around;
          gap: 8px;
        }
        .sf-speed-item {
          flex: 1;
          padding: 12px 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
        }
        .sf-speed-item.active {
          background: rgba(255,215,120,0.15);
          border-color: #ffd700;
          color: #ffd700;
        }

        /* 숏폼 댓글 팝업 */
        .sf-comments-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #0d0d11;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          border-top: 1px solid rgba(255,255,255,0.12);
          z-index: 200;
          height: 65dvh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.25s ease-out;
        }
        .sf-comments-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-weight: 900;
          font-size: 15px;
        }
         .sf-comments-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        /* 중앙 재생/일시정지 버튼 오버레이 */
        .sf-center-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s, transform 0.25s;
        }
        .sf-center-play-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .sf-center-play-overlay.flash {
          animation: iconFlash 0.8s ease-out forwards;
        }
        .sf-center-play-btn {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        @keyframes iconFlash {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          15% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1.1);
          }
          40% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>

      {!playerLandscapeMode ? (
        <div className="sf-container">
          {/* 블러 썸네일 배경 */}
          <img src={currentImageSrc} className="sf-blur-bg" alt="" />
          <div className="sf-overlay" />

          {/* 오디오 엘리먼트 */}
          {!locked && audioSrc && (
            <audio
              key={`${workId}-${episodeKey}-${part}`}
              ref={audioRef}
              src={audioSrc}
              crossOrigin="anonymous"
              preload="auto"
              autoPlay
              style={{ display: "none" }}
              onLoadedMetadata={() => {
                const a = audioRef.current;
                if (!a) return;
                setDuration(a.duration || 0);
                a.playbackRate = playbackRate;
                a.volume = volume;
                if (resumeTime > 0) {
                  a.currentTime = resumeTime;
                  setCurrentTime(resumeTime);
                }
                if (!pendingAutoplayRef.current && !autoplay && resumeTime <= 0) return;
                a.play()
                  .then(async () => {
                    setIsPlaying(true);
                    setStatus("재생 중");
                    pendingAutoplayRef.current = false;
                  })
                  .catch(() => {
                    setIsPlaying(false);
                    setStatus("자동재생이 차단됐어요. 재생 버튼을 눌러주세요.");
                  });
              }}
              onPlay={() => {
                setIsPlaying(true);
                setStatus("재생 중");
                window.dispatchEvent(new Event("fade-out-background-music"));
              }}
              onPause={() => {
                setIsPlaying(false);
                setStatus("일시정지");
                window.dispatchEvent(new Event("play-default-music"));
              }}
              onEnded={() => {
                setIsPlaying(false);
                setStatus("다음으로 넘어가는 중...");
                window.dispatchEvent(new Event("play-default-music"));
                goNextPart();
              }}
              onError={() => {
                setIsPlaying(false);
                setStatus("오디오 파일을 찾지 못했습니다.");
              }}
              onTimeUpdate={onTimeUpdate}
            />
          )}

          {/* 상단 탑바 */}
          <div className="sf-header">
            <button className="sf-back-btn" onClick={() => router.push("/")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>{episodeKey}화</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className="sf-speed-btn" onClick={() => setShowSpeedMenu(true)}>
                ⏱️ {playbackRate}x
              </button>
              <button className="sf-more-btn" onClick={toggleLandscapePlayer} title="시네마(가로) 모드">
                ⋮
              </button>
            </div>
          </div>

          {/* 중앙 재생/일시정지 버튼 오버레이 */}
          {!locked && (
            <div 
              className={`sf-center-play-overlay ${!isPlaying && !isFlashing ? "visible" : ""} ${isFlashing ? "flash" : ""}`}
              onClick={togglePlayPause}
            >
              <div className="sf-center-play-btn">
                {isFlashing ? (
                  flashType === "play" ? (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: "4px" }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  )
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: "4px" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          )}

          {/* 중앙 자막 영역 */}
          <div className="sf-caption-container" onClick={togglePlayPause}>
            {locked ? (
              <div
                className="lockCard"
                style={{
                  width: "100%",
                  maxHeight: "90%",
                  overflowY: "auto",
                  borderRadius: 24,
                  padding: 22,
                  background: "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
                  border: "1px solid rgba(255,215,120,0.95)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                  color: "#2b1d00",
                  pointerEvents: "auto",
                  textAlign: "left",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>잠금 편</div>
                <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6, lineHeight: 1.3 }}>
                  {work.title} {episodeKey}화 {part}편은 잠겨 있어요
                </div>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, opacity: 0.9 }}>
                  보유 포인트: {points}P
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => unlockWithPoints(part)}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: "none",
                      background: "#2b1d00",
                      color: "#ffd700",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    포인트 {POINTS_PER_PART}로 1편 오픈
                  </button>
                  <button
                    onClick={unlockAllParts}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: "1px solid #2b1d00",
                      background: "transparent",
                      color: "#2b1d00",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    광고로 전체 오픈
                  </button>
                  <button
                    onClick={() => router.push("/points")}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: "none",
                      background: "rgba(255,255,255,0.7)",
                      color: "#2b1d00",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    포인트 충전하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="sf-caption-text">
                {caption || " "}
              </div>
            )}
          </div>

          {/* 우측 액션 바 */}
          <div className="sf-right-bar">
            {/* 즐겨찾기 */}
            <button className={`sf-action-item ${isFavorited ? "active" : ""}`} onClick={toggleFavorite}>
              <div className="sf-action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorited ? "#ffd700" : "none"} stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <span className="sf-action-label">{isFavorited ? "1" : "0"}</span>
            </button>

            {/* 회차 선택 */}
            <button className="sf-action-item" onClick={() => {
              setActiveSheetTab("episodes");
              setShowPartList(true);
            }}>
              <div className="sf-action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </div>
              <span className="sf-action-label">회차</span>
            </button>

            {/* 댓글 */}
            <button className="sf-action-item" onClick={() => setShowCommentsPopup(true)}>
              <div className="sf-action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <span className="sf-action-label">댓글</span>
            </button>

            {/* 공유 */}
            <button className="sf-action-item" onClick={handleShare}>
              <div className="sf-action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </div>
              <span className="sf-action-label">공유</span>
            </button>
          </div>

          {/* 좌측 하단 메타 영역 */}
          <div className="sf-meta-left">
            <div className="sf-meta-title" onClick={() => router.push(`/work/${workId}`)}>
              <span>{work.title}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
            <div className="sf-meta-desc-wrap">
              {work.description}
            </div>
            <button className="sf-more-link" onClick={() => {
              setActiveSheetTab("story");
              setShowPartList(true);
            }}>
              ... 더 보기
            </button>
          </div>

          {/* 하단 진행 타임라인 */}
          <div className="sf-timeline">
            <span className="sf-time-text">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="sf-progress-slider"
              min={0}
              max={Math.max(duration, 0)}
              step={1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => handleSeek(Number(e.target.value))}
            />
            <span className="sf-time-text">{formatTime(duration)}</span>
          </div>

          {/* 맨 하단 가입 액션 */}
          <div className="sf-bottom-bar" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="sf-membership-btn"
              style={{ flex: 1, opacity: isSubscribed ? 0.7 : 1 }}
              onClick={() => router.push("/membership")}
            >
              {isSubscribed ? "👑 작가 후원 중" : "👑 멤버십 가입"}
            </button>
            <button
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
                padding: "0 10px",
                whiteSpace: "nowrap"
              }}
              onClick={handleDownload}
            >
              다운로드
            </button>
          </div>

          {/* 회차 선택 바텀 시트 */}
          {showPartList && (
            <>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} onClick={() => setShowPartList(false)} />
              <div className="sf-bottom-sheet">
                {/* 상단 스와이프 핸들바 */}
                <div className="sf-sheet-handle" />

                {/* 닫기 헤더 */}
                <div className="sf-sheet-header">
                  <button className="sf-sheet-close-btn" onClick={() => setShowPartList(false)}>×</button>
                </div>

                {/* 작품 정보 영역 */}
                <div className="sf-sheet-info">
                  <img src={workThumbnail} alt={work.title} className="sf-sheet-thumb" />
                  <div className="sf-sheet-meta">
                    <div className="sf-sheet-meta-title">{work.title}</div>
                    <div className="sf-sheet-meta-views">조회수 {work.views || "0"}</div>
                    <div className="sf-sheet-meta-rating">⭐ 4.9 (2.4K) 평가하기 &gt;</div>
                  </div>
                </div>

                {/* 줄거리 / 회차 전환 탭 */}
                <div className="sf-sheet-tabs">
                  <div 
                    className={`sf-sheet-tab ${activeSheetTab === "story" ? "active" : ""}`}
                    onClick={() => setActiveSheetTab("story")}
                  >
                    줄거리
                  </div>
                  <div 
                    className={`sf-sheet-tab ${activeSheetTab === "episodes" ? "active" : ""}`}
                    onClick={() => setActiveSheetTab("episodes")}
                  >
                    회차
                  </div>
                </div>

                {activeSheetTab === "story" ? (
                  /* 줄거리 탭 활성화 */
                  <div style={{ textAlign: "left", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {work.description}
                  </div>
                ) : (
                  /* 회차 탭 활성화 */
                  <>
                    {/* 30화 단위 페이징 영역 */}
                    {episodes.length > 30 && (
                      <div className="sf-sheet-ranges">
                        {Array.from({ length: Math.ceil(episodes.length / 30) }).map((_, idx) => {
                          const start = idx * 30 + 1;
                          const end = Math.min((idx + 1) * 30, episodes.length);
                          return (
                            <div 
                              key={idx}
                              className={`sf-sheet-range-item ${activeRangeIndex === idx ? "active" : ""}`}
                              onClick={() => setActiveRangeIndex(idx)}
                            >
                              {start}-{end}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 현재 재생중인 화의 파트(편) 선택 */}
                    {TOTAL_PARTS > 1 && (
                      <div 
                        style={{ 
                          margin: "0 0 16px", 
                          padding: "12px", 
                          background: "rgba(255,255,255,0.04)", 
                          borderRadius: "12px",
                          textAlign: "left"
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "rgba(255,255,255,0.6)" }}>
                          {episodeKey}화의 다른 편 선택:
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {Array.from({ length: TOTAL_PARTS }).map((_, idx) => {
                            const partNum = idx + 1;
                            const isCurrentPart = partNum === part;
                            const isPartLocked = !isSubscribed && partNum > unlockedUntil;

                            return (
                              <button
                                key={partNum}
                                onClick={() => {
                                  setShowPartList(false);
                                  onSelectPart(partNum);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  border: isCurrentPart ? "1.5px solid #e8356d" : "1px solid rgba(255,255,255,0.14)",
                                  background: isCurrentPart ? "rgba(232,53,109,0.12)" : "rgba(255,255,255,0.06)",
                                  color: isPartLocked ? "rgba(255,255,255,0.4)" : "white",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                              >
                                {partNum}편 {isCurrentPart ? "▶" : ""} {isPartLocked ? "🔒" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 6열 에피소드 그리드 */}
                    <div className="sf-episode-grid">
                      {episodes.slice(activeRangeIndex * 30, (activeRangeIndex + 1) * 30).map((ep) => {
                        const isCurrent = String(ep.id) === String(episodeKey);
                        const isLocked = ep.locked;

                        return (
                          <button
                            key={ep.id}
                            className={`sf-episode-cell ${isCurrent ? "active" : ""} ${isLocked ? "locked" : ""}`}
                            onClick={() => {
                              setShowPartList(false);
                              router.replace(`/episode/${workId}/${ep.id}?part=1&autoplay=1`);
                            }}
                          >
                            <span>{ep.id}</span>
                            {isLocked && <span className="sf-episode-lock-icon">🔒</span>}
                            {isCurrent && <span className="sf-episode-playing-icon">📊</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* 재생 속도 조절 팝업 */}
          {showSpeedMenu && (
            <>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} onClick={() => setShowSpeedMenu(false)} />
              <div className="sf-bottom-sheet">
                <div className="sf-sheet-title">
                  <span>재생 속도 설정</span>
                  <button className="sf-sheet-close" onClick={() => setShowSpeedMenu(false)}>닫기</button>
                </div>
                <div className="sf-speed-list">
                  {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      className={`sf-speed-item ${playbackRate === rate ? "active" : ""}`}
                      onClick={() => {
                        changePlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 작품 설명 더보기 팝업 모달 */}
          {showDescriptionPopup && (
            <div className="sf-popup-overlay" onClick={() => setShowDescriptionPopup(false)}>
              <div className="sf-popup-card" onClick={(e) => e.stopPropagation()}>
                <div className="sf-popup-title">{work.title} 줄거리</div>
                <div className="sf-popup-body" style={{ maxHeight: "50dvh", overflowY: "auto" }}>{work.description}</div>
                <button className="sf-popup-btn" onClick={() => setShowDescriptionPopup(false)}>닫기</button>
              </div>
            </div>
          )}

          {/* 댓글 팝업 바텀 시트 */}
          {showCommentsPopup && (
            <>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 199 }} onClick={() => setShowCommentsPopup(false)} />
              <div className="sf-comments-sheet">
                <div className="sf-comments-header">
                  <span>댓글 목록</span>
                  <button className="sf-sheet-close" onClick={() => setShowCommentsPopup(false)}>닫기</button>
                </div>
                <div className="sf-comments-body">
                  <Comments workId={workId} episodeId={String(episodeKey)} />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* 기존 시네마 가로 모드 (유지) */
        !locked && (
          <div
            onMouseMove={handlePlayerInteraction}
            onTouchStart={handlePlayerInteraction}
            onClick={() => {
              setShowPartMenuCinema(false);
              setShowSpeedMenu(false);
              setShowCinemaComments(false);
              handlePlayerInteraction();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "#000",
              overflow: "hidden",
              fontFamily: cinemaFont,
            }}
          >
            <img
              src={currentImageSrc}
              alt={`${work.title} ${episodeKey}화 ${part}편`}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "brightness(0.42)",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.14) 30%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.84) 100%)",
              }}
            />

            {showPlayerUi && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exitCinemaMode();
                }}
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(15,15,15,0.42)",
                  color: "rgba(255,255,255,0.94)",
                  fontSize: 26,
                  fontWeight: 500,
                  lineHeight: 1,
                  cursor: "pointer",
                  zIndex: 4,
                  backdropFilter: "blur(8px)",
                  fontFamily: cinemaFont,
                }}
              >
                ×
              </button>
            )}

            {showPlayerUi && (
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 10px",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(10,10,10,0.40)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    fontFamily: cinemaFont,
                  }}
                >
                  음량
                </span>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onInput={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  style={{
                    writingMode: "vertical-lr" as any,
                    WebkitAppearance: "slider-vertical",
                    width: 28,
                    height: 150,
                    accentColor: "#e50914",
                    cursor: "pointer",
                    touchAction: "pan-y",
                  }}
                />
              </div>
            )}

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "38%",
                transform: "translateX(-50%)",
                width: "82%",
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              <div
                style={{
                  maxWidth: 980,
                  textAlign: "center",
                  fontSize: captionFontSize + 4,
                  fontWeight: 700,
                  lineHeight: 1.58,
                  letterSpacing: "-0.025em",
                  color: "rgba(255,255,255,0.98)",
                  textShadow: "0 2px 8px rgba(0,0,0,0.78)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                  padding: "0 18px",
                  margin: "0 auto",
                  fontFamily: cinemaFont,
                }}
              >
                {caption || " "}
              </div>
            </div>

            {showPlayerUi && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "58%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 34,
                  zIndex: 4,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    seekBy(-10);
                  }}
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(18,18,18,0.38)",
                    color: "rgba(255,255,255,0.96)",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    fontFamily: cinemaFont,
                  }}
                >
                  -10
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.12)",
                    color: "white",
                    fontSize: 28,
                    fontWeight: 700,
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    fontFamily: cinemaFont,
                  }}
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    seekBy(10);
                  }}
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(18,18,18,0.38)",
                    color: "rgba(255,255,255,0.96)",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    fontFamily: cinemaFont,
                  }}
                >
                  +10
                </button>
              </div>
            )}

            {showPlayerUi && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 38,
                  transform: "translateX(-50%)",
                  width: "min(1120px, 90vw)",
                  zIndex: 4,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr 70px",
                    alignItems: "center",
                    gap: 12,
                    padding: "0 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.88)",
                      textAlign: "left",
                      fontFamily: cinemaFont,
                    }}
                  >
                    {formatTime(currentTime)}
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(duration, 0)}
                    step={1}
                    value={Math.min(currentTime, duration || 0)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSeek(Number(e.target.value));
                    }}
                    style={{
                      width: "100%",
                      accentColor: "#e50914",
                      cursor: "pointer",
                    }}
                  />

                  <span
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.88)",
                      textAlign: "right",
                      fontFamily: cinemaFont,
                    }}
                  >
                    {formatTime(duration)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpeedMenu((v) => !v);
                        setShowPartMenuCinema(false);
                        setShowCinemaComments(false);
                        resetHideTimer();
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(10,10,10,0.40)",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        fontFamily: cinemaFont,
                      }}
                    >
                      속도 {playbackRate}x
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPartMenuCinema((v) => !v);
                        setShowSpeedMenu(false);
                        setShowCinemaComments(false);
                        resetHideTimer();
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(10,10,10,0.40)",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        fontFamily: cinemaFont,
                      }}
                    >
                      파트 선택
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCinemaComments((v) => !v);
                        setShowPartMenuCinema(false);
                        setShowSpeedMenu(false);
                        resetHideTimer();
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(10,10,10,0.40)",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        fontFamily: cinemaFont,
                      }}
                    >
                      댓글
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goNextPart();
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.12)",
                      color: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                      backdropFilter: "blur(8px)",
                      fontFamily: cinemaFont,
                    }}
                  >
                    다음 편
                  </button>
                </div>

                {showSpeedMenu && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      bottom: 120,
                      display: "flex",
                      gap: 8,
                      padding: 10,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.88)",
                    }}
                  >
                    {[0.8, 1, 1.2, 1.5].map((rate) => (
                      <button
                        key={rate}
                        onClick={(e) => {
                          e.stopPropagation();
                          changePlaybackRate(rate);
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border:
                            playbackRate === rate
                              ? "2px solid rgba(255,215,120,0.9)"
                              : "1px solid rgba(255,255,255,0.14)",
                          background:
                            playbackRate === rate
                              ? "rgba(255,215,120,0.12)"
                              : "rgba(255,255,255,0.04)",
                          color: "white",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}

                {showPartMenuCinema && (
                  <div
                    style={{
                      position: "absolute",
                      right: 70,
                      bottom: 120,
                      width: "min(200px, 70vw)",
                      maxHeight: 360,
                      overflowY: "auto",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.88)",
                      padding: 10,
                      display: "grid",
                      gap: 8,
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
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: isActive
                              ? "2px solid rgba(255,215,120,0.9)"
                              : "1px solid rgba(255,255,255,0.14)",
                            background: isActive
                              ? "rgba(255,215,120,0.12)"
                              : "rgba(255,255,255,0.04)",
                            color: isLocked ? "rgba(255,255,255,0.38)" : "white",
                            fontWeight: isActive ? 900 : 700,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {p}편 {isActive ? "▶ 재생중" : ""} {isLocked ? "🔒" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}

                {showCinemaComments && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: -430,
                      width: "min(420px, 92vw)",
                      height: "min(70vh, 640px)",
                      zIndex: 6,
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(8,8,8,0.92)",
                      backdropFilter: "blur(10px)",
                      overflow: "hidden",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        fontWeight: 900,
                        color: "white",
                      }}
                    >
                      <span>댓글</span>
                      <button
                        onClick={() => setShowCinemaComments(false)}
                        style={{
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                          color: "white",
                          borderRadius: 10,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        닫기
                      </button>
                    </div>

                    <div style={{ height: "calc(100% - 58px)", overflowY: "auto", padding: 12 }}>
                      <Comments workId={workId} episodeId={String(episodeKey)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </main>
  );
}