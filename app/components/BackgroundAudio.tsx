"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";

const DEFAULT_TRACK = "/audio/background-music.mp3";

export default function BackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAudioMuted = useGameStore((state: any) => state.game.isAudioMuted);
  const fadeFrameRef = useRef<number | null>(null);

  const tryPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const promise = audio.play();
    if (promise && typeof promise.then === "function") {
      promise.catch(() => {
        // 브라우저 자동 재생 제한으로 인해 실패할 수 있음.
      });
    }
  };

  const fadeTo = (targetVolume: number, duration = 800, onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrameRef.current) clearInterval(fadeFrameRef.current);
    const startVolume = audio.volume;
    const delta = targetVolume - startVolume;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      audio.volume = Math.max(0, Math.min(1, startVolume + delta * progress));
      if (progress >= 1) {
        clearInterval(timer);
        fadeFrameRef.current = null;
        if (onComplete) onComplete();
      }
    }, 100); // 10 fps is enough for audio fade
    fadeFrameRef.current = timer as any;
  };

  const playDefaultMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src.endsWith(DEFAULT_TRACK)) {
      tryPlay();
      fadeTo(0.25);
      return;
    }
    audio.src = DEFAULT_TRACK;
    audio.volume = 0;
    tryPlay();
    fadeTo(0.25, 800);
  };

  const fadeOutBackgroundMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeTo(0, 800, () => audio.pause());
  };

  // 1. Initial Setup & Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.src = DEFAULT_TRACK;
    audio.volume = isAudioMuted ? 0 : 0.25;

    window.addEventListener("play-default-music", playDefaultMusic);
    window.addEventListener("fade-out-background-music", fadeOutBackgroundMusic);

    return () => {
      window.removeEventListener("play-default-music", playDefaultMusic);
      window.removeEventListener("fade-out-background-music", fadeOutBackgroundMusic);
      if (fadeFrameRef.current) cancelAnimationFrame(fadeFrameRef.current);
    };
  }, []);

  // 2. React to Mute state change
  useEffect(() => {
    if (isAudioMuted) {
      fadeOutBackgroundMusic();
    } else {
      playDefaultMusic();
    }
  }, [isAudioMuted]);

  return <audio ref={audioRef} preload="none" style={{ display: "none" }} />;
}
