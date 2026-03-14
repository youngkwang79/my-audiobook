"use client";

import TopBar from "@/app/components/TopBar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_TOTAL_PARTS = 30;
const DEFAULT_FREE_PARTS = 8;
const POINTS_PER_PART = 60;
const SERIES_PREFIX = "cheonmujin";
const WORK_THUMBNAIL = "/thumbnails/cheonmujin.jpg";

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

function getTotalParts(episodeKey: string) {
  return EPISODE_TOTAL_PARTS[episodeKey] ?? DEFAULT_TOTAL_PARTS;
}

function getFreeParts(episodeKey: string) {
  return Math.min(DEFAULT_FREE_PARTS, getTotalParts(episodeKey));
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

async function fetchEntitlement(episodeKey: string): Promise<EntitlementPayload> {
  const token = await getAccessToken();

  if (!token) {
    return {
      points: 0,
      is_subscribed: false,
      unlocked_until_part: null,
    };
  }

  const qs = new URLSearchParams({
    work_id: SERIES_PREFIX,
    episode_id: episodeKey,
  });

  const res = await fetch(`/api/me/entitlements?${qs.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return {
      points: 0,
      is_subscribed: false,
      unlocked_until_part: null,
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`failed_to_fetch_entitlements: ${res.status} ${text}`);
  }

  return res.json();
}

const LAST_NUM_EPISODE = Math.max(
  ...Object.keys(EPISODE_TOTAL_PARTS)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => Number(k))
);

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const episodeKey = String(params.id);
  const autoplay = searchParams.get("autoplay") === "1";

  const TOTAL_PARTS = useMemo(() => getTotalParts(episodeKey), [episodeKey]);
  const FREE_PARTS = useMemo(() => getFreeParts(episodeKey), [episodeKey]);

  const [captionFontSize, setCaptionFontSize] = useState(22);
  const [showPartList, setShowPartList] = useState(false);
  const [showPartMenuCinema, setShowPartMenuCinema] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
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

  const R2_BASE = "https://pub-593ff1dc4440464cb156da505f73a555.r2.dev";
  const WORKER_BASE = "https://transcribe-worker.uns00.workers.dev";

  const getR2AudioUrl = (episodeKeyValue: string, partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    return `${R2_BASE}/${folder}/${pad2(partValue)}.MP3`;
  };

  const getR2ImageCandidates = (episodeKeyValue: string, _partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    const base = `${R2_BASE}/${folder}/01`;
    return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
  };

  const getR2CaptionUrl = (episodeKeyValue: string, partValue: number) => {
    const folder = getEpisodeFolder(episodeKeyValue);
    return `${R2_BASE}/${folder}/${pad2(partValue)}.json`;
  };

  const getWorkerUrl = (episodeKeyValue: string, partValue: number) =>
    `${WORKER_BASE}/?episode=${encodeURIComponent(episodeKeyValue)}&part=${encodeURIComponent(String(partValue))}`;

  const audioSrc = !lockedMemo(isSubscribed, part, unlockedUntil) ? getR2AudioUrl(episodeKey, part) : null;

  const imageCandidates = useMemo(
    () => getR2ImageCandidates(episodeKey, part),
    [episodeKey, part]
  );

  const currentImageSrc =
    imageErrorCount >= imageCandidates.length
      ? WORK_THUMBNAIL
      : imageCandidates[imageIndex] || WORK_THUMBNAIL;

  const locked = useMemo(() => {
    if (isSubscribed) return false;
    return part > unlockedUntil;
  }, [isSubscribed, part, unlockedUntil]);

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
        const data = await fetchEntitlement(episodeKey);
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
  }, [episodeKey, FREE_PARTS, TOTAL_PARTS]);

  useEffect(() => {
    setImageIndex(0);
    setImageErrorCount(0);
  }, [episodeKey, part]);

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
function groupSegmentsForReading(input: Segment[]): Segment[] {
  if (!input.length) return [];

  const out: Segment[] = [];
  let current: Segment = {
    start: input[0].start,
    end: input[0].end,
    text: String(input[0].text || "").trim(),
  };

  for (let i = 1; i < input.length; i++) {
    const next = input[i];
    const nextText = String(next.text || "").trim();
    if (!nextText) continue;

    const currentDuration = current.end - current.start;
    const gap = next.start - current.end;
    const punctuationCount = (current.text.match(/[.!?。！？]/g) || []).length;

    const shouldMerge =
      gap <= 0.45 &&
      currentDuration < 4.2 &&
      current.text.length < 110 &&
      punctuationCount < 3;

    if (shouldMerge) {
      current = {
        start: current.start,
        end: next.end,
        text: `${current.text} ${nextText}`.replace(/\s+/g, " ").trim(),
      };
    } else {
      out.push(current);
      current = {
        start: next.start,
        end: next.end,
        text: nextText,
      };
    }
  }

  out.push(current);
  return out;
}
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
const grouped = groupSegmentsForReading(parsed);
setSegments(grouped);
        setCaptionStatus(parsed.length ? "자막 준비 완료" : "자막 데이터가 비어있어요");
        return;
      }

      setCaptionStatus("자막 생성 중(처음 1회)...");

      const workerRes = await fetch(getWorkerUrl(episodeKey, part), {
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
const grouped2 = groupSegmentsForReading(parsed2);
setSegments(grouped2);
      setCaptionStatus(parsed2.length ? "자막 준비 완료" : "자막 데이터가 비어있어요");
    }

    loadCaptions().catch((error) => {
      if (!alive) return;
      console.error("[caption] load error:", error);
      setCaptionStatus("자막 로드 중 오류");
    });

    return () => {
      alive = false;
    };
  }, [episodeKey, part, locked]);

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

    const current = segs[i];
    if (!(t >= current.start && t <= current.end + 0.2)) {
  return;
}

    let merged = "";
    let sentenceCount = 0;

    for (let j = i; j < segs.length; j++) {
      const text = String(segs[j].text || "").trim();
      if (!text) continue;

      merged += (merged ? " " : "") + text;

      const matches = text.match(/[.!?。！？]/g);
      sentenceCount += matches ? matches.length : 0;

      if (sentenceCount >= 3) break;
      if (merged.length > 140) break;
    }

    setCaption(merged.trim());
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;

    setCurrentTime(a.currentTime || 0);
    updateCaptionByTime(a.currentTime);
  };

  function formatTime(sec: number) {
    const safe = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

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

    try {
      const token = await getAccessToken();

      if (!token) {
        router.replace(`/episode/${nextEpisodeKey}?part=1`);
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
      const nextLocked = !Number(data?.is_subscribed) && 1 > nextUnlockedUntil;

      if (!nextLocked) {
        pendingAutoplayRef.current = true;
        router.replace(`/episode/${nextEpisodeKey}?part=1&autoplay=1`);
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
          router.replace(`/episode/${nextEpisodeKey}?part=1&autoplay=1`);
          return;
        }
      }

      router.replace(`/episode/${nextEpisodeKey}?part=1`);
    } finally {
      isNavigatingRef.current = false;
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
      router.replace(`/episode/${episodeKey}?part=${next}&autoplay=1`);
      return;
    }

    if (points >= POINTS_PER_PART && !autoUnlockBusy) {
      setStatus(`다음 편이 잠겨 있어 ${POINTS_PER_PART}P로 자동 오픈 중...`);
      setAutoUnlockBusy(true);

      try {
        const ok = await unlockWithPoints(next);
        if (!ok) {
          setPart(next);
          router.replace(`/episode/${episodeKey}?part=${next}`);
        }
      } finally {
        setAutoUnlockBusy(false);
      }
      return;
    }

    setStatus("다음 편은 잠겨 있고 포인트가 부족합니다.");
    setPart(next);
    router.replace(`/episode/${episodeKey}?part=${next}`);
  };

  const unlockAllParts = () => {
    alert("광고 리워드(서버 검증) 붙이면 전체 오픈으로 연결됩니다. 지금은 준비중입니다.");
  };

  const unlockWithPoints = async (targetPart = part) => {
    try {
      const token = await getAccessToken();

      if (!token) {
        alert("로그인이 필요합니다.");
        router.push(`/login?redirect=/episode/${episodeKey}?part=${targetPart}`);
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
          router.push(`/login?redirect=/episode/${episodeKey}?part=${targetPart}`);
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
      router.replace(`/episode/${episodeKey}?part=${targetPart}&autoplay=1`);
      return true;
    } catch (error) {
      console.error(error);
      alert("네트워크 오류가 발생했습니다.");
      return false;
    }
  };

  const onSelectPart = async (p: number) => {
    setShowPartList(false);
    setShowPartMenuCinema(false);
    setPart(p);

    const pLocked = !isSubscribed && p > unlockedUntil;

    if (!pLocked) {
      router.replace(`/episode/${episodeKey}?part=${p}&autoplay=1`);
      return;
    }

    if (points >= POINTS_PER_PART) {
      const ok = await unlockWithPoints(p);
      if (!ok) {
        router.replace(`/episode/${episodeKey}?part=${p}`);
      }
      return;
    }

    router.replace(`/episode/${episodeKey}?part=${p}`);
  };

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
        {episodeKey}화 - {part}편
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

            {!!captionStatus && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  opacity: 0.66,
                }}
              >
                {captionStatus}
              </div>
            )}
          </div>

          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
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
              max={36}
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
{!locked && (
  <audio
    key={`${episodeKey}-${part}`}
    ref={audioRef}
    src={audioSrc!}
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
      setIsPlaying(false);
      setStatus(`오디오 로드 실패: ${audioSrc}`);
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
                      {episodeKey}화 {part}편은 잠겨 있어요
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
          onClick={handlePlayerInteraction}
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
            alt={`${episodeKey}화 ${part}편`}
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

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 140,
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
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 34,
                pointerEvents: "none",
                zIndex: 4,
              }}
            >
              <button
  onClick={(e) => {
    e.stopPropagation();
    seekBy(-10);
  }}
  style={{
    pointerEvents: "auto",
    width: 82,
    height: 82,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(18,18,18,0.38)",
    color: "rgba(255,255,255,0.96)",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
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
    pointerEvents: "auto",
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
    pointerEvents: "auto",
    width: 82,
    height: 82,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(18,18,18,0.38)",
    color: "rgba(255,255,255,0.96)",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
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
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px 18px 18px",
                zIndex: 4,
                color: "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
  style={{
    minWidth: 46,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    color: "rgba(255,255,255,0.88)",
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
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    accentColor: "#e50914",
                    cursor: "pointer",
                  }}
                />

                <span
  style={{
    minWidth: 46,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textAlign: "right",
    color: "rgba(255,255,255,0.88)",
    fontFamily: cinemaFont,
  }}
>
  {formatTime(duration)}
</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  position: "relative",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPartMenuCinema((v) => !v);
                    resetHideTimer();
                  }}
                  style={{
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,10,10,0.40)",
  color: "rgba(255,255,255,0.95)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  fontFamily: cinemaFont,
                  }}
                >
                  회차
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeedMenu((v) => !v);
                    resetHideTimer();
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.30)",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  속도({playbackRate}x)
                </button>

                <div
                   style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10,10,10,0.40)",
    backdropFilter: "blur(8px)",
    fontFamily: cinemaFont,
                  }}
                >
                  <span
  style={{
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "-0.02em",
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
                    defaultValue={1}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    style={{ width: 120, accentColor: "#e50914" }}
                  />
                </div>

                <div
                    style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10,10,10,0.40)",
    backdropFilter: "blur(8px)",
    fontFamily: cinemaFont,
                  }}
                >
                  <span
  style={{
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "rgba(255,255,255,0.95)",
    fontFamily: cinemaFont,
  }}
>
  자막
</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptionFontSize((v) => Math.max(16, v - 2));
                      resetHideTimer();
                    }}
                    style={{
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: cinemaFont,
                    }}
                  >
                    -
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptionFontSize((v) => Math.min(40, v + 2));
                      resetHideTimer();
                    }}
                    style={{
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: cinemaFont,
                    }}
                  >
                    +
                  </button>
                </div>

                {showSpeedMenu && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 58,
                      left: "50%",
                      transform: "translateX(-50%)",
                      minWidth: 200,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.88)",
                      padding: 10,
                      display: "grid",
                      gap: 8,
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
                              ? "1px solid rgba(229,9,20,0.8)"
                              : "1px solid rgba(255,255,255,0.10)",
                          background:
                            playbackRate === rate
                              ? "rgba(229,9,20,0.18)"
                              : "rgba(255,255,255,0.04)",
                          color: "white",
                          fontSize: 15,
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
                      bottom: 58,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "min(420px, 90vw)",
                      maxHeight: 260,
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
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function lockedMemo(isSubscribed: boolean, part: number, unlockedUntil: number) {
  if (isSubscribed) return false;
  return part > unlockedUntil;
}