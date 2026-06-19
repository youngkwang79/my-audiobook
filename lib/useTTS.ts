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

    // Default voice selection strategy (Korean priorities: Yuna, Siri, Local Service, local default)
    if (allVoices.length > 0) {
      const koVoices = allVoices.filter((v) => v.lang.startsWith("ko"));
      const localKoVoices = koVoices.filter((v) => v.localService);
      
      let defaultVoice = localKoVoices.find((v) => v.name.includes("Yuna") || v.name.includes("유나"));
      if (!defaultVoice) defaultVoice = localKoVoices.find((v) => v.name.toLowerCase().includes("siri"));
      if (!defaultVoice) defaultVoice = localKoVoices[0]; // Any local Korean voice
      if (!defaultVoice) defaultVoice = koVoices.find((v) => v.name.includes("Google"));
      if (!defaultVoice) defaultVoice = koVoices[0] || allVoices.find((v) => v.default);
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
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSegmentIndex(0);
    setCurrentTime(0);
  }, []);

  // Speak a specific segment index
  const speakSegment = useCallback((index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

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
      speakSegment(index + 1);
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
        speakSegment(nextIdx);
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
              speakSegment(index);
            }, 100);
          }
          return;
        }
      }

      // If user paused or cancelled, error code is often 'interrupted' or 'canceled' - ignore in that case
      if (e.error !== "interrupted" && e.error !== "canceled" && playStateRef.current.isPlaying) {
        const nextIdx = index + 1;
        setCurrentSegmentIndex(nextIdx);
        speakSegment(nextIdx);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [segments, selectedVoice, voices, playbackRate, onSegmentEnd, onPlaybackFinished]);

  // Pause speech synthesis
  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
  }, []);

  // Resume speech synthesis or play from current index
  const play = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
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
