"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type TTSSegment = {
  start: number;
  end: number;
  text: string;
};

interface UseTTSProps {
  segments: TTSSegment[];
  onSegmentEnd?: (index: number) => void;
  onPlaybackFinished?: () => void;
}

function cleanTextForTTS(text: string): string {
  if (!text) return "";
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") // HTML 태그 제거
    .replace(/\[.*?\]/g, "") // 대괄호 내용 제거 (예: [음악])
    .replace(/\(.*?\)/g, "") // 소괄호 내용 제거 (예: (웃음))
    .replace(/\s+/g, " ") // 연속된 공백 제거
    .trim();
}

export function useTTS({ segments, onSegmentEnd, onPlaybackFinished }: UseTTSProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playStateRef = useRef({
    isPlaying: false,
    currentIndex: 0,
    rate: 1.0,
  });

  // Keep ref values in sync for async callbacks
  useEffect(() => {
    playStateRef.current = {
      isPlaying,
      currentIndex: currentSegmentIndex,
      rate: playbackRate,
    };
  }, [isPlaying, currentSegmentIndex, playbackRate]);

  // Set total duration based on the end of the last segment
  useEffect(() => {
    if (segments.length > 0) {
      setDuration(segments[segments.length - 1].end);
    } else {
      setDuration(0);
    }
  }, [segments]);

  // Load available voices
  const loadVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const allVoices = window.speechSynthesis.getVoices();
    setVoices(allVoices);

    // Default voice selection strategy
    if (allVoices.length > 0) {
      const koVoices = allVoices.filter((v) => v.lang.startsWith("ko"));
      
      // Sort koVoices to prefer Online/Natural high-quality voices
      const sortedKoVoices = [...koVoices].sort((a, b) => {
        const aIsOnline = a.name.includes("Online") || a.name.includes("Natural");
        const bIsOnline = b.name.includes("Online") || b.name.includes("Natural");
        if (aIsOnline && !bIsOnline) return -1;
        if (!aIsOnline && bIsOnline) return 1;
        return 0;
      });

      // 1. 선희 최우선 선택 (Edge 고품질 여성 음성)
      let defaultVoice = sortedKoVoices.find(v => {
        const lowerName = v.name.toLowerCase();
        return lowerName.includes("sunhi") || lowerName.includes("선희");
      });
      
      // 2. 없으면 Apple 유나, Siri 선택 (iOS용 고품질 여성 음성)
      if (!defaultVoice) {
        defaultVoice = sortedKoVoices.find((v) => {
          const lowerName = v.name.toLowerCase();
          return lowerName.includes("yuna") || lowerName.includes("유나") || lowerName.includes("siri");
        });
      }

      // 3. 없으면 Google 한국어 선택 (크롬용 여성 음성)
      if (!defaultVoice) {
        defaultVoice = sortedKoVoices.find((v) => {
          const lowerName = v.name.toLowerCase();
          return lowerName.includes("google") && (lowerName.includes("ko") || lowerName.includes("kr") || lowerName.includes("korean"));
        });
      }
      
      // 4. 없으면 현수, 인준 선택 (Edge 고품질 남성 음성)
      if (!defaultVoice) {
        defaultVoice = sortedKoVoices.find(v => {
          const lowerName = v.name.toLowerCase();
          return lowerName.includes("hyunsu") || lowerName.includes("현수") || 
                 lowerName.includes("injoon") || lowerName.includes("인준");
        });
      }
      
      // 5. 그것도 없으면 기타 한국어 로컬 음성
      if (!defaultVoice) {
        const localKoVoices = sortedKoVoices.filter((v) => v.localService);
        defaultVoice = localKoVoices[0] || sortedKoVoices[0] || allVoices.find((v) => v.default);
      }
      
      setSelectedVoice(defaultVoice || null);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  // Stop speaking and clear all state
  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSegmentIndex(0);
    setCurrentTime(0);
  }, []);

  // Speak a specific segment index
  const speakSegment = useCallback((index: number, clearQueue: boolean = true) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    if (clearQueue) {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      window.speechSynthesis.cancel();
    }

    if (index < 0 || index >= segments.length) {
      setIsPlaying(false);
      if (onPlaybackFinished) onPlaybackFinished();
      return;
    }

    const segment = segments[index];
    const textToSpeak = cleanTextForTTS(segment.text);

    if (!textToSpeak) {
      // Empty text segment: skip to next
      setCurrentSegmentIndex(index + 1);
      speakSegment(index + 1, false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Web Speech API rate limits: standard is 0.1 to 10
    utterance.rate = playbackRate;

    // Estimate progress tick parameters
    const startVal = segment.start;
    const endVal = segment.end;
    const estDurationMs = (endVal - startVal) * 1000 / playbackRate;
    const speakStartTime = Date.now();
    
    let timerId: any = null;
    const startProgressTimer = () => {
      timerId = setInterval(() => {
        if (!playStateRef.current.isPlaying) {
          clearInterval(timerId);
          return;
        }
        const elapsed = (Date.now() - speakStartTime) / 1000 * playbackRate;
        const currentSimTime = Math.min(endVal, startVal + elapsed);
        setCurrentTime(currentSimTime);
      }, 100);
    };

    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentSegmentIndex(index);
      setCurrentTime(segment.start);
      startProgressTimer();
    };

    utterance.onend = () => {
      if (timerId) clearInterval(timerId);
      setCurrentTime(segment.end);
      if (onSegmentEnd) onSegmentEnd(index);

      // Speak next segment only if playing state is still active
      if (playStateRef.current.isPlaying) {
        const nextIdx = index + 1;
        setCurrentSegmentIndex(nextIdx);
        
        // 200ms의 자연스러운 숨쉬기 간격(호흡)을 두고 다음 문장 재생
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = setTimeout(() => {
          if (playStateRef.current.isPlaying && playStateRef.current.currentIndex === nextIdx) {
            speakSegment(nextIdx, false);
          }
        }, 200);
      }
    };

    utterance.onerror = (e) => {
      if (timerId) clearInterval(timerId);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.error("TTS Speak Error:", e.error, e);
      }

      // 클라우드 음성 합성 실패 시 기기 내장 음성으로 자동 폴백
      if (e.error === "synthesis-failed" && selectedVoice && !selectedVoice.localService) {
        const localKoVoice = voices.find(v => v.lang.startsWith("ko") && v.localService);
        if (localKoVoice) {
          setSelectedVoice(localKoVoice);
          if (playStateRef.current.isPlaying) {
            setTimeout(() => {
              speakSegment(index, true); // 에러 발생 시 큐 초기화 후 재시도
            }, 100);
          }
          return;
        }
      }

      // If user paused or cancelled, error code is often 'interrupted' or 'canceled' - ignore in that case
      if (e.error !== "interrupted" && e.error !== "canceled" && playStateRef.current.isPlaying) {
        const nextIdx = index + 1;
        setCurrentSegmentIndex(nextIdx);
        
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = setTimeout(() => {
          if (playStateRef.current.isPlaying && playStateRef.current.currentIndex === nextIdx) {
            speakSegment(nextIdx, false);
          }
        }, 200);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [segments, selectedVoice, voices, playbackRate, onSegmentEnd, onPlaybackFinished]);

  // Pause speech synthesis
  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    window.speechSynthesis.pause();
    setIsPlaying(false);
  }, []);

  // Resume speech synthesis or play from current index
  const play = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      window.speechSynthesis.cancel();
      setIsPlaying(true);
      speakSegment(currentSegmentIndex);
    }
  }, [currentSegmentIndex, speakSegment]);

  // Seek to a specific segment index
  const seekToSegment = useCallback((index: number) => {
    const safeIdx = Math.max(0, Math.min(index, segments.length - 1));
    setCurrentSegmentIndex(safeIdx);
    
    if (segments[safeIdx]) {
      setCurrentTime(segments[safeIdx].start);
    }

    if (isPlaying) {
      speakSegment(safeIdx);
    }
  }, [segments, isPlaying, speakSegment]);

  // Seek to a specific time (approximate to nearest segment)
  const seekToTime = useCallback((time: number) => {
    if (segments.length === 0) return;
    
    // Find segment closest to the target time
    let closestIdx = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (time >= seg.start && time <= seg.end) {
        closestIdx = i;
        break;
      }
      const diff = Math.min(Math.abs(time - seg.start), Math.abs(time - seg.end));
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    
    seekToSegment(closestIdx);
  }, [segments, seekToSegment]);

  // Update utterance rate dynamically if playback rate changes
  useEffect(() => {
    if (isPlaying && utteranceRef.current) {
      // Need to cancel and speak again with new rate because SpeechSynthesisUtterance.rate cannot be changed dynamically while speaking
      speakSegment(currentSegmentIndex);
    }
  }, [playbackRate]);

  // Update voice dynamically if selectedVoice changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isPlaying) {
      // Cancel and speak again immediately with the new voice
      speakSegment(currentSegmentIndex);
    } else {
      // If paused, cancel active synthesis so that next play starts fresh with new voice
      window.speechSynthesis.cancel();
    }
  }, [selectedVoice]);

  return {
    isPlaying,
    playbackRate,
    setPlaybackRate,
    currentSegmentIndex,
    currentTime,
    duration,
    voices,
    selectedVoice,
    setSelectedVoice,
    play,
    pause,
    stop,
    seekToSegment,
    seekToTime,
  };
}
