"use client";

import { works } from "@/app/data/works";
import { getEpisodesByWork, getTotalPartsByWork } from "@/app/data/episodes";
import TopBar from "@/app/components/TopBar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
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

  const cinemaFont =
    '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif';

  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [resumeTime, setResumeTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
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

  const [imageIndex, setImageIndex] = useState(0);
  const [imageErrorCount, setImageErrorCount] = useState(0);
  const [audioIndex, setAudioIndex] = useState(0);

  const R2_BASE = "https://pub-0f35ad90f1ea477d862bf039f6761249.r2.dev";
  const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

  const getAudioCandidates = (episodeKeyValue: string, partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    return AUDIO_EXTENSIONS.map(
      (ext) => `${R2_BASE}/${SERIES_PREFIX}/${folder}/${pad2(partValue)}.${ext}`
    );
  };

  const getR2ImageCandidates = (episodeKeyValue: string, _partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    const base = `${R2_BASE}/${SERIES_PREFIX}/${folder}/01`;
    return IMAGE_EXTENSIONS.map((ext) => `${base}.${ext}`);
  };

  const getR2CaptionUrl = (episodeKeyValue: string, partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    return `${R2_BASE}/${SERIES_PREFIX}/${folder}/${pad2(partValue)}.json`;
  };

  const getWorkerUrl = (episodeKeyValue: string, partValue: number) =>
    `${WORKER_BASE}/?workId=${encodeURIComponent(SERIES_PREFIX)}&episode=${encodeURIComponent(
      episodeKeyValue
    )}&part=${encodeURIComponent(String(partValue))}`;

  const locked = useMemo(() => {
    if (isSubscribed) return false;
    return part > unlockedUntil;
  }, [isSubscribed, part, unlockedUntil]);

  const audioCandidates = useMemo(
    () => (!locked ? getAudioCandidates(episodeKey, part) : []),
    [episodeKey, part, workId, locked]
  );

  const audioSrc = !locked ? audioCandidates[audioIndex] ?? null : null;

  const imageCandidates = useMemo(
    () => getR2ImageCandidates(episodeKey, part),
    [episodeKey, part, workId]
  );

  const currentImageSrc =
    imageErrorCount >= imageCandidates.length
      ? WORK_THUMBNAIL
      : imageCandidates[imageIndex] || WORK_THUMBNAIL;

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
    } catch {}
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
    setImageIndex(0);
    setImageErrorCount(0);
  }, [episodeKey, part, workId]);

  useEffect(() => {
    setAudioIndex(0);
  }, [episodeKey, part, workId]);

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

      const r2b = await fetchJsonSafe(jsonUrl);
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

          if (isMobile && !autoEnteredCinema) {
            setAutoEnteredCinema(true);
            await enterCinemaMode();
          }
        })
        .catch(() => {
          setIsPlaying(false);
          setStatus("자동재생이 차단됐어요. 재생 버튼을 한 번 눌러주세요.");
        });
    }, 120);

    return () => clearTimeout(t);
  }, [autoplay, locked, episodeKey, part, audioSrc, isMobile, autoEnteredCinema]);

  const enterCinemaMode = async () => {
    setPlayerLandscapeMode(true);
    resetHideTimer();

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
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
    } catch {}
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

        if (isMobile && !autoEnteredCinema) {
          setAutoEnteredCinema(true);
          await enterCinemaMode();
        }
      } else {
        a.pause();
        setIsPlaying(false);
      }
    } catch {}

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
          } catch {}

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
      } catch {}

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
          minHeight: "100vh",
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
        minHeight: "100vh",
        background: "#0b0b12",
        color: "white",
        padding: 20,
      }}
    >
      <style>{`
        @media (max-width: 820px) {
          .episodeMain {
            padding: 12px !important;
          }
        }
      `}</style>

      {!playerLandscapeMode && <TopBar />}

      <h1 style={{ marginTop: 14 }}>
        {work.title} · {episodeKey}화
        {currentEpisode?.title ? ` - ${currentEpisode.title}` : ""} · {part}편
      </h1>

      <div
        className="episodeGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          marginTop: 14,
        }}
      >
        <section style={{ borderRadius: 14, padding: 14, minHeight: 320 }}>
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setShowPartList((v) => !v)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 900,
                fontSize: 16,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              현재 재생: {part}편 {showPartList ? "▲" : "▼"}
            </button>

            {showPartList && (
              <div
                style={{
                  maxHeight: isMobile ? 240 : 320,
                  overflowY: "auto",
                  borderRadius: 16,
                  background: "#15151d",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                  padding: 8,
                  marginTop: 8,
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
                        width: "100%",
                        minHeight: 48,
                        marginBottom: 6,
                        borderRadius: 12,
                        border: isActive
                          ? "2px solid rgba(255,215,120,0.9)"
                          : "1px solid rgba(255,255,255,0.16)",
                        background: isActive
                          ? "rgba(255,215,120,0.12)"
                          : "rgba(255,255,255,0.04)",
                        color: isLocked ? "rgba(255,255,255,0.38)" : "white",
                        fontWeight: isActive ? 900 : 700,
                        fontSize: 17,
                        cursor: "pointer",
                        textAlign: "left",
                        padding: "0 14px",
                      }}
                    >
                      {p}편 {isActive ? "▶ 재생중" : ""} {isLocked ? "🔒" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              marginBottom: 10,
              padding: "18px 20px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center",
              height: 380,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: captionFontSize,
                fontWeight: 900,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 10,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                color: "rgba(255,255,255,0.92)",
                
              }}
            >
              {caption || " "}
            </div>

            {!caption && !locked && (
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
                {captionStatus || (entBusy ? "권한 확인 중..." : "")}
              </div>
            )}
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: "16px 22px",
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.58)",
                minWidth: 42,
              }}
            >
              작게
            </span>

            <input
              type="range"
              min={16}
              max={66}
              step={1}
              value={captionFontSize}
              onChange={(e) => setCaptionFontSize(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: "#6f7684",
                cursor: "pointer",
                filter: "brightness(0.85)",
              }}
            />

            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.58)",
                minWidth: 42,
                textAlign: "right",
              }}
            >
              크게
            </span>

            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.78)",
                minWidth: 28,
                textAlign: "right",
              }}
            >
              {captionFontSize}
            </span>
          </div>

          {!locked && audioSrc && (
            <audio
              key={`${workId}-${episodeKey}-${part}-${audioIndex}`}
              ref={audioRef}
              src={audioSrc}
              controls={!playerLandscapeMode}
              preload="auto"
              autoPlay
              style={
                playerLandscapeMode
                  ? {
                      position: "fixed",
                      width: 1,
                      height: 1,
                      opacity: 0,
                      pointerEvents: "none",
                      left: -9999,
                      top: -9999,
                    }
                  : {
                      width: "100%",
                      marginBottom: 16,
                    }
              }
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

                    if (isMobile && !autoEnteredCinema) {
                      setAutoEnteredCinema(true);
                      await enterCinemaMode();
                    }
                  })
                  .catch(() => {
                    setIsPlaying(false);
                    setStatus("자동재생이 차단됐어요. 재생 버튼을 눌러주세요.");
                  });
              }}
              onPlay={() => {
                setIsPlaying(true);
                setStatus("재생 중");
              }}
              onPause={() => {
                setIsPlaying(false);
                setStatus("일시정지");
              }}
              onError={() => {
                if (audioIndex < audioCandidates.length - 1) {
                  setAudioIndex((prev) => prev + 1);
                  setStatus(
                    `오디오 형식 변경 시도 중... (${audioIndex + 2}/${audioCandidates.length})`
                  );
                  return;
                }

                setIsPlaying(false);
                setStatus("오디오 파일을 찾지 못했습니다. R2 파일명과 확장자를 확인해주세요.");
              }}
              onEnded={() => {
                setIsPlaying(false);
                setStatus("다음으로 넘어가는 중...");
                goNextPart();
              }}
              onTimeUpdate={onTimeUpdate}
            />
          )}

          {!locked && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                onClick={togglePlayPause}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {isPlaying ? "일시정지" : "재생"}
              </button>

              <button
                onClick={toggleLandscapePlayer}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                시네마 모드
              </button>
            </div>
          )}

          {!locked && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => seekBy(-10)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                -10초
              </button>

              <button
                onClick={() => seekBy(10)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                +10초
              </button>

              <button
                onClick={goNextPart}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                다음 편
              </button>
            </div>
          )}

          {!locked && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ minWidth: 46, fontSize: 13 }}>{formatTime(currentTime)}</span>

                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0)}
                  step={1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#d4a23c" }}
                />

                <span style={{ minWidth: 46, fontSize: 13, textAlign: "right" }}>
                  {formatTime(duration)}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[0.8, 1, 1.2, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border:
                        playbackRate === rate
                          ? "2px solid rgba(255,215,120,0.9)"
                          : "1px solid rgba(255,255,255,0.14)",
                      background:
                        playbackRate === rate
                          ? "rgba(255,215,120,0.12)"
                          : "rgba(255,255,255,0.06)",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {rate}x
                  </button>
                ))}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ fontSize: 13 }}>음량</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    style={{ width: 140, accentColor: "#d4a23c" }}
                  />
                </div>
              </div>
            </div>
          )}

          {!locked && status && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                opacity: 0.75,
              }}
            >
              {status}
            </div>
          )}

          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              position: "relative",
            }}
          >
            <img
              src={currentImageSrc}
              alt={`${work.title} ${episodeKey}화 ${part}편 이미지`}
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
                filter: locked ? "brightness(0.72)" : "none",
                transition: "filter 180ms ease",
              }}
            />

            {locked && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.34)",
                    zIndex: 2,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 3,
                    display: "grid",
                    placeItems: "center",
                    padding: 20,
                  }}
                >
                  <div
                    className="lockCard"
                    style={{
                      width: "min(520px, 92%)",
                      maxHeight: "88%",
                      overflowY: "auto",
                      borderRadius: 24,
                      padding: 22,
                      background:
                        "linear-gradient(135deg, #fff1a8 0%, #f3c969 30%, #d4a23c 65%, #fff1a8 100%)",
                      border: "1px solid rgba(255,215,120,0.95)",
                      boxShadow: "0 18px 40px rgba(0,0,0,0.35), 0 0 30px rgba(255,215,120,0.35)",
                      color: "#2b1d00",
                      animation: "bounceIn 520ms ease-out both",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900, opacity: 0.85 }}>잠금 편</div>

                    <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>
                      {work.title} {episodeKey}화 {part}편은 잠겨 있어요
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 15,
                        fontWeight: 850,
                        opacity: 0.92,
                      }}
                    >
                      무료 이후 파트는 구독 또는 포인트 또는 광고시청이 필요합니다.
                    </div>

                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                      보유 포인트: <b>{points}P</b> · ({POINTS_PER_PART}P당 1편 해제)
                    </div>

                    <div style={{ height: 14 }} />

                    <div
                      className="lockBtns"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={() => unlockWithPoints(part)}
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
              </>
            )}
          </div>
        </section>
      </div>

      {playerLandscapeMode && !locked && (
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
      )}

      <Comments workId={workId} episodeId={String(episodeKey)} />
    </main>
  );
}