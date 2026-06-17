"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cleanHanja, parseFilename } from "../utils/stringHelpers";

const DEFAULT_VOICE_GUIDE = `[Audio Generation Rules]
- Core Rule (STRICT): Read the provided text EXACTLY as written. NEVER add, alter, or invent any dialogues, commentaries, or explanations. 
- Style: Razor-sharp, crystal-clear diction with snappy and perfect articulation. No mumbling.

[Vocal Pacing & Narration Control]
- Pacing for Descriptions (지문): When reading narrative text, slow down the pacing significantly. Do NOT rush. Take a heavy, distinct pause at every period (.) and comma (,) to build suspense.
- Pacing for Dialogue (대사): When reading text inside quotation marks (" "), transition to a natural, emotionally tense speaking pace.
- Tone: Maintain intense emotional depth and tension throughout the reading, ensuring the tone matches the dramatic atmosphere of the text.`;

function createPitchShifter(ctx: AudioContext, pitchFactor: number) {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1) as any;
  node.pitchFactor = pitchFactor;

  let delay = 0;
  const maxDelay = 0.05 * ctx.sampleRate;
  const delayBuffer = new Float32Array(maxDelay * 2);
  let writeIndex = 0;

  node.onaudioprocess = (e: any) => {
    const input = e.inputBuffer.getChannelData(0);
    const output = e.outputBuffer.getChannelData(0);
    const currentPitchFactor = node.pitchFactor;

    if (Math.abs(currentPitchFactor - 1.0) < 0.02) {
      for (let i = 0; i < input.length; i++) {
        output[i] = input[i];
      }
      return;
    }

    const rate = 1.0 - currentPitchFactor;
    for (let i = 0; i < input.length; i++) {
      delayBuffer[writeIndex] = input[i];

      let readIndex = writeIndex - delay;
      if (readIndex < 0) readIndex += delayBuffer.length;

      const baseIndex = Math.floor(readIndex);
      const frac = readIndex - baseIndex;
      const nextIndex = (baseIndex + 1) % delayBuffer.length;

      output[i] =
        delayBuffer[baseIndex] * (1.0 - frac) + delayBuffer[nextIndex] * frac;

      delay += rate;
      if (delay < 0) {
        delay += maxDelay;
      } else if (delay >= maxDelay) {
        delay -= maxDelay;
      }

      writeIndex = (writeIndex + 1) % delayBuffer.length;
    }
  };

  return node;
}

interface ParsedChapter {
  id: string;
  title: string;
  text: string;
}

interface LogLine {
  time: string;
  type: "info" | "success" | "error" | "stdout" | "stderr" | "debug" | "done";
  message: string;
}

export default function AutomationPanel({
  worksList,
  fetchWorks,
}: {
  worksList: any[];
  fetchWorks: () => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<
    "one-touch" | "legacy-tts" | "batch-tts" | "merger"
  >("one-touch");

  // --- ONE-TOUCH AUTOMATION STATE ---
  const [diskFolders, setDiskFolders] = useState<
    Array<{ name: string; path: string }>
  >([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [oneTouchWorkId, setOneTouchWorkId] = useState("");
  const [oneTouchVoice, setOneTouchVoice] = useState("ko-KR-InJoonNeural");
  const [oneTouchPitch, setOneTouchPitch] = useState("-6Hz");
  const [oneTouchRate, setOneTouchRate] = useState("-6%");
  const [oneTouchEffect, setOneTouchEffect] = useState("none");
  const [oneTouchVoiceGuide, setOneTouchVoiceGuide] =
    useState(DEFAULT_VOICE_GUIDE);
  const [oneTouchAutoThumbnail, setOneTouchAutoThumbnail] = useState(true);
  const [oneTouchIsMembershipOnly, setOneTouchIsMembershipOnly] =
    useState(false);

  const [oneTouchMode, setOneTouchMode] = useState<"single" | "continuous">(
    "single",
  );
  const [continuousLimit, setContinuousLimit] = useState(50);
  const [continuousDelay, setContinuousDelay] = useState(10); // seconds
  const [releaseDateMode, setReleaseDateMode] = useState<
    "immediate" | "3days" | "scheduled"
  >("3days");
  const [releaseDateStart, setReleaseDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [releaseDateInterval, setReleaseDateInterval] = useState<
    "1hour" | "12hour" | "1day"
  >("1day");
  const [oneTouchStopRequested, setOneTouchStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);

  const [oneTouchRunning, setOneTouchRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // --- PLAN CREATION MODAL STATE ---
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planFolderName, setPlanFolderName] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [planTempDir, setPlanTempDir] = useState("");
  const [planError, setPlanError] = useState("");
  const [runTts, setRunTts] = useState(true);

  // --- LEGACY STATE ---
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const activeShifterNodeRef = useRef<any>(null);

  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeReleaseDate, setEpisodeReleaseDate] = useState("");
  const [episodeLocked, setEpisodeLocked] = useState<
    "auto" | "free" | "locked"
  >("auto");
  const [textInput, setTextInput] = useState("");
  const [txtFiles, setTxtFiles] = useState<File[]>([]);
  // 여러 파일 선택 시 개별 큐 아이템
  const [txtFileQueue, setTxtFileQueue] = useState<Array<{
    file: File;
    episodeId: string;
    episodeTitle: string;
    status: "idle" | "running" | "success" | "error";
    errorMsg?: string;
  }>>([]);
  const [ttsIsMembershipOnly, setTtsIsMembershipOnly] = useState(false);
  const [voiceGuide, setVoiceGuide] = useState(DEFAULT_VOICE_GUIDE);

  const [voice, setVoice] = useState("ko-KR-InJoonNeural");
  const [preset, setPreset] = useState("karisma");
  const [pitch, setPitch] = useState("-6Hz");
  const [rate, setRate] = useState("-6%");

  const [customPitchVal, setCustomPitchVal] = useState(0);
  const [customRateVal, setCustomRateVal] = useState(0);
  const [effect, setEffect] = useState("none");

  const [previewText, setPreviewText] = useState(
    `살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.\n“여기 쥐새끼가 숨어 있었군. 흠, 옆에 있는 늙은이는 뭐냐? 동행인가?”\n진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다. 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.\n“이 노인은 이 일과 아무 상관 없는 지나가는 미치광이요! 원하는 건 내 목숨일 테니, 이 노인은 보내줘라!”\n살수들은 서로를 바라보며 비열한 웃음을 터뜨렸다. 그들의 웃음소리가 기괴하게 사당 안을 울렸다.`,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAudioBuffer, setPreviewAudioBuffer] =
    useState<AudioBuffer | null>(null);
  const [previewAudioCtx, setPreviewAudioCtx] = useState<AudioContext | null>(
    null,
  );
  const [previewSourceNode, setPreviewSourceNode] =
    useState<AudioBufferSourceNode | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [ttsStatus, setTtsStatus] = useState<
    "idle" | "tts" | "upload" | "db" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [schedulingType, setSchedulingType] = useState<
    "immediate" | "1hour" | "12hour" | "1day"
  >("immediate");
  const [schedulingStartDate, setSchedulingStartDate] = useState("");
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [itemStatuses, setItemStatuses] = useState<{
    [key: number]: {
      status: "idle" | "running" | "success" | "error";
      errorMsg?: string;
    };
  }>({});
  const [batchStatus, setBatchStatus] = useState<
    "idle" | "running" | "paused" | "success" | "error"
  >("idle");

  const batchActiveRef = useRef(false);
  const currentProcessingIndexRef = useRef(0);

  // 스캔 디스크 폴더 목록 로드
  const fetchDiskFolders = async () => {
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/automation/novels-on-disk", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.folders) {
        setDiskFolders(data.folders);
        if (data.folders.length > 0 && !selectedFolder) {
          setSelectedFolder(data.folders[0].path);
        }
      }
    } catch (e) {
      console.error("Failed to load directories on disk:", e);
    }
  };

  useEffect(() => {
    fetchDiskFolders();
  }, []);

  // 소설 작품 선택 시 최근 사용했던 목소리 설정 자동 복원
  useEffect(() => {
    if (!selectedWorkId) return;
    const work = worksList.find((w) => w.id === selectedWorkId);
    if (work) {
      if (work.last_voice) setVoice(work.last_voice);
      if (work.last_pitch) {
        setPitch(work.last_pitch);
        const pVal = parseInt(work.last_pitch) || 0;
        setCustomPitchVal(pVal);
      }
      if (work.last_rate) {
        setRate(work.last_rate);
        const rVal = parseInt(work.last_rate) || 0;
        setCustomRateVal(rVal);
      }
      if (work.is_membership_only !== undefined) {
        setTtsIsMembershipOnly(work.is_membership_only);
      }
      setPreset("custom");
    }
  }, [selectedWorkId, worksList]);

  // One-Touch Work ID 자동 매핑
  useEffect(() => {
    if (worksList.length > 0 && !oneTouchWorkId) {
      setOneTouchWorkId(worksList[0].id);
    }
    if (worksList.length > 0 && !selectedWorkId) {
      setSelectedWorkId(worksList[0].id);
    }
  }, [worksList]);

  // One-Touch 성우 복원
  useEffect(() => {
    if (!oneTouchWorkId) return;
    const work = worksList.find((w) => w.id === oneTouchWorkId);
    if (work) {
      if (work.last_voice) setOneTouchVoice(work.last_voice);
      if (work.last_pitch) setOneTouchPitch(work.last_pitch);
      if (work.last_rate) setOneTouchRate(work.last_rate);
      if (work.is_membership_only !== undefined)
        setOneTouchIsMembershipOnly(work.is_membership_only);
    }
  }, [oneTouchWorkId, worksList]);

  // 로그 스크롤 이동
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // --- ONE-TOUCH PIPELINE RUN ---
  const runSingleChapterStep = async (token: string) => {
    const res = await fetch("/api/admin/automation/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workId: oneTouchWorkId,
        outputDirPath: selectedFolder,
        voice: oneTouchVoice,
        pitch: oneTouchPitch,
        rate: oneTouchRate,
        voiceGuide: oneTouchVoiceGuide,
        effect: oneTouchEffect,
        autoThumbnail: oneTouchAutoThumbnail,
        is_membership_only: oneTouchIsMembershipOnly,
        releaseDateMode,
        releaseDateStart,
        releaseDateInterval,
        runTts,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "서버 응답 오류");
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("스트림 응답을 읽을 수 없습니다.");

    let buffer = "";
    let completedPayload = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (part.startsWith("data: ")) {
          try {
            const logData = JSON.parse(part.slice(6));
            const timeStr = new Date().toLocaleTimeString();

            let prefix = "";
            if (logData.type === "stdout") prefix = "💬 ";
            if (logData.type === "stderr") prefix = "⚠️ ";
            if (logData.type === "success") prefix = "✅ ";
            if (logData.type === "error") prefix = "❌ ";
            if (logData.type === "debug") prefix = "⚙️ ";

            setLogs((prev) => [
              ...prev,
              {
                time: timeStr,
                type: logData.type,
                message: `${prefix}${logData.message}`,
              },
            ]);

            if (logData.type === "done") {
              completedPayload = logData.data;
            }
          } catch (jsonErr) {
            console.error("Failed to parse log chunk:", jsonErr);
          }
        }
      }
    }

    if (!completedPayload) {
      throw new Error(
        "집필 완료 응답(done)을 받지 못했습니다. 로그를 확인해 주세요.",
      );
    }

    return completedPayload;
  };

  const handleRunOneTouchAutomation = async () => {
    if (oneTouchRunning) return;
    if (!oneTouchWorkId || !selectedFolder) {
      alert("작품 ID와 집필 폴더 경로를 지정해 주세요.");
      return;
    }

    const modeText =
      oneTouchMode === "continuous"
        ? `연속 자동 집필 (${continuousLimit}화 설정)`
        : "단일 회차 집필 (1화)";
    const confirmRun = window.confirm(
      `원터치 자동 집필 및 배포 파이프라인을 구동합니까?\n- 모드: ${modeText}\n- 공개예정: ${
        releaseDateMode === "3days"
          ? "집필일 기준 3일 뒤 공개"
          : releaseDateMode === "scheduled"
            ? "순차 예약 공개"
            : "즉시 공개"
      }`,
    );
    if (!confirmRun) return;

    setLogs([]);
    setOneTouchRunning(true);
    setOneTouchStopRequested(false);
    stopRequestedRef.current = false;

    const timeStr = new Date().toLocaleTimeString();
    setLogs([
      {
        time: timeStr,
        type: "info",
        message: `🏁 자동 집필 파이프라인 시작 (모드: ${modeText})`,
      },
    ]);

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      if (!token) throw new Error("로그인 세션이 만료되었습니다.");

      if (oneTouchMode === "single") {
        const result = await runSingleChapterStep(token);
        const doneTime = new Date().toLocaleTimeString();
        setLogs((prev) => [
          ...prev,
          {
            time: doneTime,
            type: "success",
            message: `🎉 [단일 집필 완료] 제${result.chapter}화. <${result.title}> 집필 및 배포 완료!`,
          },
        ]);
        alert(`🎉 원터치 자동 집필 및 배포 성공!\n회차: ${result.title}`);
        fetchWorks();
      } else {
        let successCount = 0;
        while (successCount < continuousLimit && !stopRequestedRef.current) {
          const currentTry = successCount + 1;
          const tryTime = new Date().toLocaleTimeString();
          setLogs((prev) => [
            ...prev,
            {
              time: tryTime,
              type: "info",
              message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            },
            {
              time: tryTime,
              type: "info",
              message: `🔄 [연속 자동 집필] 총 ${continuousLimit}화 중 ${currentTry}번째 회차 집필 시작...`,
            },
          ]);

          const result = await runSingleChapterStep(token);
          successCount++;
          fetchWorks();

          const successTime = new Date().toLocaleTimeString();
          setLogs((prev) => [
            ...prev,
            {
              time: successTime,
              type: "success",
              message: `✅ [${currentTry}/${continuousLimit}] 제${result.chapter}화. <${result.title}> 완료!`,
            },
          ]);

          if (successCount >= continuousLimit) {
            break;
          }
          if (stopRequestedRef.current) {
            const stopTime = new Date().toLocaleTimeString();
            setLogs((prev) => [
              ...prev,
              {
                time: stopTime,
                type: "error",
                message: `🚨 [중지] 사용자에 의해 다음 연속 집필 루프가 취소되었습니다.`,
              },
            ]);
            break;
          }

          const stepDelayTime = new Date().toLocaleTimeString();
          setLogs((prev) => [
            ...prev,
            {
              time: stepDelayTime,
              type: "debug",
              message: `⏳ API 안정성을 위해 다음 회차 집필 전 ${continuousDelay}초간 대기합니다...`,
            },
          ]);

          for (let sec = continuousDelay; sec > 0; sec--) {
            if (stopRequestedRef.current) break;
            await new Promise((r) => setTimeout(r, 1000));
          }

          if (stopRequestedRef.current) {
            const stopTime = new Date().toLocaleTimeString();
            setLogs((prev) => [
              ...prev,
              {
                time: stopTime,
                type: "error",
                message: `🚨 [중지] 대기 중 사용자에 의해 연속 집필이 중단되었습니다.`,
              },
            ]);
            break;
          }
        }

        const completeTime = new Date().toLocaleTimeString();
        if (stopRequestedRef.current) {
          alert(
            `⚠️ 연속 집필이 중단되었습니다.\n(성공 완료된 회차: ${successCount}개)`,
          );
        } else {
          setLogs((prev) => [
            ...prev,
            {
              time: completeTime,
              type: "success",
              message: `🏆 [최종 완료] 설정한 ${successCount}개 회차의 자동 집필 및 배포 루프가 모두 완수되었습니다!`,
            },
          ]);
          alert(
            `🏆 연속 집필 및 배포 루프 완료!\n(총 ${successCount}개 회차 완료)`,
          );
        }
      }
    } catch (err: any) {
      const errTime = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        {
          time: errTime,
          type: "error",
          message: `🔥 파이프라인 중단됨: ${err.message}`,
        },
      ]);
      alert(
        `❌ 오류로 인해 자동 집필 파이프라인이 중단되었습니다.\n사유: ${err.message}`,
      );
    } finally {
      setOneTouchRunning(false);
      setOneTouchStopRequested(false);
      stopRequestedRef.current = false;
    }
  };

  const handleStopOneTouchAutomation = () => {
    setOneTouchStopRequested(true);
    stopRequestedRef.current = true;
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        time: timeStr,
        type: "debug",
        message: `🚨 [중지 요청 수신] 진행 중인 단계가 완료되는 즉시 연속 루프가 중지됩니다.`,
      },
    ]);
  };

  const handleCreatePlan = async () => {
    setPlanLoading(true);
    setPlanError("");
    setPlanResult(null);
    setPlanTempDir("");
    setPlanFolderName("");

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/automation/create-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // temp directory is created by backend
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "시놉시스 생성 실패");
      }
      setPlanResult(data.plan);
      setPlanTempDir(data.tempDir);

      // Auto-suggest a folder name based on the title
      if (data.plan?.novel_title) {
        const safeTitle = data.plan.novel_title
          .replace(/[^\w\s가-힣]/g, "")
          .trim()
          .replace(/\s+/g, "_");
        setPlanFolderName(`무림북_${safeTitle}`);
      }
    } catch (e: any) {
      setPlanError(e.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleAcceptPlan = async () => {
    if (!planFolderName.trim()) {
      alert("최종 저장할 작품 폴더명을 입력해주세요.");
      return;
    }

    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/automation/approve-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tempDir: planTempDir,
          finalDir: planFolderName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "폴더 확정 중 오류가 발생했습니다.");
      }

      await fetchDiskFolders();
      if (data.finalDirPath) {
        setSelectedFolder(data.finalDirPath);
      }
      setOneTouchWorkId("CREATE_FROM_FOLDER");
      setPlanModalOpen(false);
      setPlanResult(null);
      setPlanTempDir("");
      setPlanFolderName("");
      alert(
        "시놉시스가 승인되었습니다. 이제 원터치 자동 집필을 누르면 1화부터 집필이 시작됩니다.",
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  // --- LEGACY HANDLERS ---
  const applyPreset = (presetName: string) => {
    setPreset(presetName);
    if (presetName === "karisma") {
      setVoice("ko-KR-InJoonNeural");
      setPitch("-6Hz");
      setRate("-6%");
    } else if (presetName === "oe-yu") {
      setVoice("ko-KR-HyunsuMultilingualNeural");
      setPitch("-3Hz");
      setRate("-3%");
      setEffect("none");
    } else if (presetName === "cave") {
      setVoice("ko-KR-InJoonNeural");
      setPitch("-4Hz");
      setRate("-5%");
      setEffect("none");
    } else if (presetName === "romance") {
      setVoice("ko-KR-HyunsuMultilingualNeural");
      setPitch("+1Hz");
      setRate("+0%");
      setEffect("none");
    } else if (presetName === "modern-fantasy") {
      setVoice("ko-KR-HyunsuMultilingualNeural");
      setPitch("-1Hz");
      setRate("+8%");
      setEffect("none");
    } else if (presetName === "furious") {
      setPitch("+4Hz");
      setRate("+12%");
    } else if (presetName === "calm") {
      setPitch("-3Hz");
      setRate("-8%");
    }
  };

  const handleCustomPitchChange = (val: number) => {
    setCustomPitchVal(val);
    const sign = val >= 0 ? "+" : "";
    const newPitch = `${sign}${val}Hz`;
    setPitch(newPitch);
    const pitchFactor = Math.pow(2, val / 120);
    if (activeShifterNodeRef.current) {
      activeShifterNodeRef.current.pitchFactor = pitchFactor;
    }
  };

  const handleCustomRateChange = (val: number) => {
    setCustomRateVal(val);
    const sign = val >= 0 ? "+" : "";
    const newRate = `${sign}${val}%`;
    setRate(newRate);
    if (previewSourceNode && isPreviewPlaying) {
      previewSourceNode.playbackRate.value = calcPlaybackRate(newRate);
    }
  };


  /** 파일 본문 첫 수백 자에서 "(숫자)화" 패턴을 찾아 회차번호·제목 추출 */
  const parseTitleFromContent = (content: string): { id: string; title: string } | null => {
    // 앞부분 500자만 검사 (제목은 보통 서두에 있음)
    const head = content.slice(0, 500);

    // 패턴 1: [제N화. <제목>]  또는  [제N화. 제목]
    const p1 = head.match(/\[제?\s*(\d+)\s*화[.\s]*[<「『【]?([^>\]」』】\n]+)[>\]」』】]?/);
    if (p1) return { id: String(Number(p1[1])), title: p1[2].trim().replace(/[<>「」『』【】\[\]]/g, "") };

    // 패턴 2: 제N화 <제목>  (대괄호 없음)
    const p2 = head.match(/제\s*(\d+)\s*화\s*[.\s]*[<「『【]([^>\n「」『』】]+)[>」』】]/);
    if (p2) return { id: String(Number(p2[1])), title: p2[2].trim() };

    // 패턴 3: 제N화 제목  (꺾쇠 없음)
    const p3 = head.match(/제\s*(\d+)\s*화\s*[.\-\s]+([^\n\[<]{2,40})/);
    if (p3) return { id: String(Number(p3[1])), title: p3[2].trim().replace(/[.,!?。]/g, "") };

    // 패턴 4: N화  (숫자화만)
    const p4 = head.match(/(\d+)\s*화/);
    if (p4) return { id: String(Number(p4[1])), title: `${Number(p4[1])}화` };

    return null;
  };

  /** 파일명에서 회차번호·제목 추출 (폴백) */
  const parseTitleFromFilename = (filename: string): { id: string; title: string } => {
    const base = filename.replace(/\.[^/.]+$/, "");
    const match = base.trim().match(/^(\d+)(?:화)?[\s\-_.]+(.+)$/);
    if (match) return { id: String(Number(match[1])), title: match[2].trim() };
    const onlyNum = base.trim().match(/^(\d+)(?:화)?$/);
    if (onlyNum) return { id: String(Number(onlyNum[1])), title: `${Number(onlyNum[1])}화` };
    return { id: "", title: base.trim() };
  };

  const handleTxtFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files).sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      setTxtFiles(fileList);

      if (fileList.length === 1) {
        // 단일 파일: 내용 파싱 우선, 없으면 파일명 폴백
        const file = fileList[0];
        const rawText = await file.text();
        setTextInput(cleanHanja(rawText));
        setTxtFileQueue([]);

        const fromContent = parseTitleFromContent(rawText);
        if (fromContent) {
          setEpisodeId(fromContent.id);
          setEpisodeTitle(fromContent.title);
        } else {
          const fromFile = parseTitleFromFilename(file.name);
          setEpisodeId(fromFile.id);
          setEpisodeTitle(fromFile.title);
        }
      } else {
        // 여러 파일: 파일별 내용 파싱 → 큐 생성
        setTextInput("");
        setEpisodeId("");
        setEpisodeTitle("");

        const queueItems: typeof txtFileQueue = [];
        for (const file of fileList) {
          const rawText = await file.text();
          const fromContent = parseTitleFromContent(rawText);
          const fallback = parseTitleFromFilename(file.name);
          const parsedId = fromContent?.id || fallback.id;
          const parsedTitle = fromContent?.title || fallback.title;
          queueItems.push({ file, episodeId: parsedId, episodeTitle: parsedTitle, status: "idle" });
        }
        setTxtFileQueue(queueItems);
      }
    }
    e.target.value = "";
  };

  const handleSplitFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = cleanHanja(await file.text());

      const headerRegex = /^\[\s*(.+?)\s*\]$/;
      const lines = text.split(/\r?\n/);
      const chapters: ParsedChapter[] = [];
      let currentHeader = "";
      let currentLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(headerRegex);
        if (match) {
          if (currentHeader || currentLines.join("").trim().length > 0) {
            const titleText = currentHeader || "프롤로그";
            const { id, title } = parseFilename(titleText + ".txt");
            chapters.push({
              id,
              title,
              text: currentLines.join("\n").trim(),
            });
          }
          currentHeader = match[1].trim();
          currentLines = [];
        } else {
          currentLines.push(line);
        }
      }

      if (currentHeader || currentLines.join("").trim().length > 0) {
        const titleText = currentHeader || "마지막 화";
        const { id, title } = parseFilename(titleText + ".txt");
        chapters.push({
          id,
          title,
          text: currentLines.join("\n").trim(),
        });
      }

      setParsedChapters(chapters);
      setItemStatuses({});
      setBatchStatus("idle");
      setCurrentBatchIndex(0);
      currentProcessingIndexRef.current = 0;
    }
  };

  const updateParsedChapter = (
    idx: number,
    field: keyof ParsedChapter,
    value: string,
  ) => {
    setParsedChapters((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const calcPlaybackRate = (rateStr: string): number => {
    const ratePercent = parseInt(rateStr) || 0;
    const rateFactor = (100 + ratePercent) / 100;
    return Math.max(0.1, rateFactor);
  };

  const stopPreviewSource = () => {
    if (previewSourceNode) {
      try {
        previewSourceNode.stop();
      } catch (e) {}
      previewSourceNode.disconnect();
      setPreviewSourceNode(null);
    }
    if (activeShifterNodeRef.current) {
      activeShifterNodeRef.current.disconnect();
      activeShifterNodeRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  const playBufferFromStart = (buffer: AudioBuffer, ctx: AudioContext) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calcPlaybackRate(rate);

    const pitchHz = parseInt(pitch) || 0;
    const pitchFactor = Math.pow(2, pitchHz / 120);

    const shifter = createPitchShifter(ctx, pitchFactor);
    activeShifterNodeRef.current = shifter;

    source.connect(shifter);
    shifter.connect(ctx.destination);

    source.start(0);
    source.onended = () => setIsPreviewPlaying(false);
    setPreviewSourceNode(source);
    setIsPreviewPlaying(true);
    return source;
  };

  const handlePlayPreview = async () => {
    if (!previewText.trim()) return;
    if (isPreviewPlaying) {
      stopPreviewSource();
      return;
    }
    if (previewAudioBuffer && previewAudioCtx) {
      playBufferFromStart(previewAudioBuffer, previewAudioCtx);
      return;
    }

    setPreviewLoading(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: previewText,
          voice,
          pitch,
          rate,
          effect,
          preview: true,
          voiceGuide,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || "미리듣기 음성 생성 실패");
      }

      const arrayBuf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);

      setPreviewAudioBuffer(decoded);
      setPreviewAudioCtx(ctx);
      playBufferFromStart(decoded, ctx);
    } catch (err: any) {
      alert("미리듣기 실패: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReplayPreview = async () => {
    if (!previewText.trim()) return;
    stopPreviewSource();
    setPreviewAudioBuffer(null);
    if (previewAudioCtx) {
      try {
        previewAudioCtx.close();
      } catch (e) {}
      setPreviewAudioCtx(null);
    }
    setPreviewLoading(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: previewText,
          voice,
          pitch,
          rate,
          effect,
          preview: true,
          voiceGuide,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || "다시듣기 실패");
      }
      const arrayBuf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setPreviewAudioBuffer(decoded);
      setPreviewAudioCtx(ctx);
      playBufferFromStart(decoded, ctx);
    } catch (err: any) {
      alert("다시듣기 실패: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getEpisodeLockedStatus = (episodeIdStr: string) => {
    if (episodeLocked === "free") return false;
    if (episodeLocked === "locked") return true;
    const work = worksList.find((w) => w.id === selectedWorkId);
    const freeCount = work?.free_episodes ?? 10;
    const epNum = Number(episodeIdStr);
    return isNaN(epNum) ? true : epNum > freeCount;
  };

  const handleTtsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !episodeReleaseDate) {
      alert("작품과 공개 예정 일시를 입력해 주세요.");
      return;
    }

    const token = await supabase.auth
      .getSession()
      .then((s) => s.data.session?.access_token);
    if (!token) { alert("로그인 세션이 만료되었습니다."); return; }

    // ── 여러 파일 큐 처리 ──
    if (txtFileQueue.length > 0) {
      setTtsStatus("tts");
      setErrorMsg("");
      let successCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < txtFileQueue.length; i++) {
        const item = txtFileQueue[i];
        if (item.status === "success") { successCount++; continue; }
        if (!item.episodeId || !item.episodeTitle) {
          setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "error", errorMsg: "회차번호 또는 제목이 비어있습니다." } : q));
          failedItems.push(item.file.name);
          continue;
        }

        setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "running" } : q));

        try {
          const text = cleanHanja(await item.file.text());
          const res = await fetch("/api/admin/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              text,
              voice, pitch, rate, effect,
              preview: false,
              workId: selectedWorkId,
              episodeId: item.episodeId,
              title: item.episodeTitle,
              locked: getEpisodeLockedStatus(item.episodeId),
              releaseDate: new Date(episodeReleaseDate).toISOString(),
              is_membership_only: ttsIsMembershipOnly,
              voiceGuide,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.details || result.error || "오디오 생성 실패");
          setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "success" } : q));
          successCount++;
        } catch (err: any) {
          setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "error", errorMsg: err.message } : q));
          failedItems.push(`${item.episodeId}화 (${item.episodeTitle})`);
        }
      }

      setTtsStatus("success");
      fetchWorks();
      if (failedItems.length > 0) {
        alert(`일괄 연성 완료. 성공: ${successCount}개, 실패: ${failedItems.length}개\n\n실패 목록:\n${failedItems.join("\n")}`);
      } else {
        alert(`🎉 총 ${successCount}개 회차 오디오 일괄 연성 및 홈페이지 반영 완료!`);
        setTxtFileQueue([]);
        setTxtFiles([]);
      }
      return;
    }

    // ── 단일 파일 또는 직접 입력 처리 ──
    if (!episodeId || !episodeTitle) {
      alert("회차 번호와 제목을 입력해 주세요.");
      return;
    }
    if (!textInput.trim()) {
      alert("회차 본문 텍스트를 입력하거나 텍스트 파일을 첨부해 주세요.");
      return;
    }

    setTtsStatus("tts");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: textInput,
          voice, pitch, rate, preview: false,
          workId: selectedWorkId,
          episodeId,
          title: episodeTitle,
          locked: getEpisodeLockedStatus(episodeId),
          releaseDate: episodeReleaseDate,
          is_membership_only: ttsIsMembershipOnly,
          voiceGuide,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.details || result.error || "오디오 생성/등록 실패");

      setTtsStatus("success");
      alert(`🎉 [연성 완료] ${episodeTitle} 오디오가 R2에 업로드되고 홈페이지에 즉시 반영되었습니다!`);
      setEpisodeId("");
      setEpisodeTitle("");
      setTextInput("");
      setTxtFiles([]);
      setTtsIsMembershipOnly(false);
    } catch (err: any) {
      console.error(err);
      setTtsStatus("error");
      setErrorMsg(err.message);
    }
  };

  const runBatch = async (startIndex: number) => {
    if (parsedChapters.length === 0) return;
    batchActiveRef.current = true;
    setBatchStatus("running");

    let index = startIndex;
    currentProcessingIndexRef.current = index;
    setCurrentBatchIndex(index);

    const token = await supabase.auth
      .getSession()
      .then((s) => s.data.session?.access_token);
    if (!token) {
      alert("로그인 세션이 만료되었습니다.");
      setBatchStatus("idle");
      batchActiveRef.current = false;
      return;
    }

    const startBaseTime = new Date(schedulingStartDate || new Date());
    const failedList: string[] = [];
    let successCount = 0;

    for (let i = 0; i < startIndex; i++) {
      if (itemStatuses[i]?.status === "success") {
        successCount++;
      } else if (itemStatuses[i]?.status === "error") {
        const ch = parsedChapters[i];
        failedList.push(`${ch.id}화 (${ch.title})`);
      }
    }

    while (index < parsedChapters.length && batchActiveRef.current) {
      setItemStatuses((prev) => ({
        ...prev,
        [index]: { status: "running" },
      }));

      const chapter = parsedChapters[index];
      let calculatedReleaseDate = new Date(startBaseTime);
      if (schedulingType === "1hour") {
        calculatedReleaseDate.setHours(startBaseTime.getHours() + index);
      } else if (schedulingType === "12hour") {
        calculatedReleaseDate.setHours(startBaseTime.getHours() + index * 12);
      } else if (schedulingType === "1day") {
        calculatedReleaseDate.setDate(startBaseTime.getDate() + index);
      }

      try {
        const epLockedVal = getEpisodeLockedStatus(chapter.id);
        const targetWork = worksList.find((w) => w.id === selectedWorkId);
        const isMembershipOnlyVal = targetWork?.is_membership_only ?? false;

        const res = await fetch("/api/admin/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: chapter.text,
            voice,
            pitch,
            rate,
            effect,
            preview: false,
            workId: selectedWorkId,
            episodeId: chapter.id,
            title: chapter.title,
            locked: epLockedVal,
            releaseDate: calculatedReleaseDate.toISOString(),
            is_membership_only: isMembershipOnlyVal,
            voiceGuide,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(
            result.details || result.error || "오디오 생성/등록 실패",
          );
        }

        setItemStatuses((prev) => ({
          ...prev,
          [index]: { status: "success" },
        }));
        successCount++;
      } catch (err: any) {
        console.error(`Error processing chapter at index ${index}:`, err);
        setItemStatuses((prev) => ({
          ...prev,
          [index]: { status: "error", errorMsg: err.message },
        }));
        failedList.push(`${chapter.id}화 (${chapter.title})`);
      }

      index++;
      currentProcessingIndexRef.current = index;
      setCurrentBatchIndex(index);
    }

    batchActiveRef.current = false;
    if (index >= parsedChapters.length) {
      setBatchStatus("success");
      fetchWorks();
      if (failedList.length > 0) {
        alert(
          `일괄 연성이 완료되었으나, 에러가 발생한 회차가 있습니다.\n\n- 성공: ${successCount}화\n- 실패: ${failedList.length}화\n\n[실패 회차 목록]\n${failedList.join("\n")}`,
        );
      } else {
        alert(
          `🎉 모든 회차의 오디오 일괄 연성이 성공적으로 완료되었습니다! (총 ${successCount}개 회차)`,
        );
      }
    } else {
      setBatchStatus("paused");
    }
  };

  const pauseBatch = () => {
    batchActiveRef.current = false;
    setBatchStatus("paused");
  };

  const resumeBatch = () => {
    runBatch(currentBatchIndex);
  };

  const cancelBatch = () => {
    batchActiveRef.current = false;
    setBatchStatus("idle");
    setCurrentBatchIndex(0);
    setItemStatuses({});
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeFiles.length === 0) {
      alert("합포장할 텍스트 파일들을 선택해 주세요.");
      return;
    }
    setMerging(true);
    try {
      const token = await supabase.auth
        .getSession()
        .then((s) => s.data.session?.access_token);
      const formData = new FormData();
      for (const file of mergeFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/admin/merge-chapters", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "파일 합본 생성 실패");
      }

      const selectedWork = worksList.find((w) => w.id === selectedWorkId);
      const downloadName = selectedWork
        ? `[완결]${selectedWork.title}.txt`
        : "전체_합본_소설.txt";
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert("✨ 합포장이 완료되어 다운로드되었습니다!");
      setMergeFiles([]);
    } catch (err: any) {
      alert("합포장 중 오류 발생: " + err.message);
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => {
    stopPreviewSource();
    setPreviewAudioBuffer(null);
    if (previewAudioCtx) {
      try {
        previewAudioCtx.close();
      } catch (e) {}
      setPreviewAudioCtx(null);
    }
  }, [voice, previewText, effect]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 서브 탭 헤더 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: 10,
        }}
      >
        <button
          onClick={() => setSubTab("one-touch")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 700,
            background:
              subTab === "one-touch" ? "rgba(255, 42, 95, 0.15)" : "none",
            border:
              subTab === "one-touch"
                ? "1px solid #ff2a5f"
                : "1px solid transparent",
            borderRadius: "8px",
            color: subTab === "one-touch" ? "#ff2a5f" : "rgba(255,255,255,0.6)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🚀 원터치 자동화 파이프라인
        </button>
        <button
          onClick={() => setSubTab("legacy-tts")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 700,
            background:
              subTab === "legacy-tts" ? "rgba(255, 42, 95, 0.15)" : "none",
            border:
              subTab === "legacy-tts"
                ? "1px solid #ff2a5f"
                : "1px solid transparent",
            borderRadius: "8px",
            color:
              subTab === "legacy-tts" ? "#ff2a5f" : "rgba(255,255,255,0.6)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🎙️ 개별 오디오 연성 (Manual TTS)
        </button>
        <button
          onClick={() => setSubTab("batch-tts")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 700,
            background:
              subTab === "batch-tts" ? "rgba(255, 42, 95, 0.15)" : "none",
            border:
              subTab === "batch-tts"
                ? "1px solid #ff2a5f"
                : "1px solid transparent",
            borderRadius: "8px",
            color: subTab === "batch-tts" ? "#ff2a5f" : "rgba(255,255,255,0.6)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          📝 합본 분할 연성 (Batch TTS)
        </button>
        <button
          onClick={() => setSubTab("merger")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 700,
            background:
              subTab === "merger" ? "rgba(255, 42, 95, 0.15)" : "none",
            border:
              subTab === "merger"
                ? "1px solid #ff2a5f"
                : "1px solid transparent",
            borderRadius: "8px",
            color: subTab === "merger" ? "#ff2a5f" : "rgba(255,255,255,0.6)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          📦 텍스트 파일 합포장 (Merger)
        </button>
      </div>

      {/* --- 서브 탭 1: 원터치 자동화 --- */}
      {subTab === "one-touch" && (
        <div
          className="card-panel"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
              🚀 원터치 무림북 집필 & 배포 자동화
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.5,
              }}
            >
              단 한 번의 버튼 클릭으로 AI가 다음 화의 본문을 집필하고,
              강호록(인물록)을 갱신하며, 자동으로 TTS 음원을 합성하여 R2 업로드
              및 DB 발행을 완수합니다. 1화인 경우 고해상도 AI 표지까지 자동
              생성해 줍니다.
            </p>
          </div>

          {/* 집필 모드 및 공개 예약 설정 */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: 16,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                paddingBottom: 6,
              }}
            >
              ⚙️ 자동화 모드 및 공개 스케줄링 설정
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">집필 방식 선택</label>
                <select
                  className="form-select"
                  value={oneTouchMode}
                  onChange={(e) => setOneTouchMode(e.target.value as any)}
                >
                  <option value="single">단일 회차 집필 (1화씩 진행)</option>
                  <option value="continuous">
                    연속 자동 집필 (지정된 화수만큼 자동 반복)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">공개 예정일 설정</label>
                <select
                  className="form-select"
                  value={releaseDateMode}
                  onChange={(e) => setReleaseDateMode(e.target.value as any)}
                >
                  <option value="3days">
                    📅 집필일 기준 3일 뒤 공개 예정 (권장)
                  </option>
                  <option value="immediate">
                    🔓 즉시 공개 (공개 예정일 없음)
                  </option>
                  <option value="scheduled">
                    ⏱️ 사용자 지정 순차 예약 공개
                  </option>
                </select>
              </div>
            </div>

            {/* 연속 집필 모드 상세 설정 */}
            {oneTouchMode === "continuous" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  background: "rgba(255,255,255,0.01)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div className="form-group">
                  <label className="form-label">
                    연속 집필할 최대 화수 (Max Chapters)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={continuousLimit}
                    onChange={(e) => setContinuousLimit(Number(e.target.value))}
                  />
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
                  >
                    설정한 화수만큼 연달아 자동 집필을 수행합니다.
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    API 부하 방지 대기 시간 (초)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="form-input"
                    value={continuousDelay}
                    onChange={(e) => setContinuousDelay(Number(e.target.value))}
                  />
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
                  >
                    분당 요청 수 제한을 방지하기 위한 대기 간격입니다.
                  </span>
                </div>
              </div>
            )}

            {/* 사용자 지정 순차 예약 상세 설정 */}
            {releaseDateMode === "scheduled" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  background: "rgba(255,255,255,0.01)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div className="form-group">
                  <label className="form-label">
                    공개 시작 일시 (Start Date)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={releaseDateStart}
                    onChange={(e) => setReleaseDateStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">회차별 순차 공개 간격</label>
                  <select
                    className="form-select"
                    value={releaseDateInterval}
                    onChange={(e) =>
                      setReleaseDateInterval(e.target.value as any)
                    }
                  >
                    <option value="1hour">1시간 간격</option>
                    <option value="12hour">12시간 간격</option>
                    <option value="1day">1일 간격</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div className="form-group">
              <label className="form-label">대상 소설 작품 선택 (DB)</label>
              <select
                className="form-select"
                value={oneTouchWorkId}
                onChange={(e) => setOneTouchWorkId(e.target.value)}
              >
                <option value="CREATE_FROM_FOLDER">
                  ✨ [자동 생성] 폴더명 기준 신규 등록
                </option>
                {worksList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPlanModalOpen(true)}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#fff",
                  background: "linear-gradient(90deg, #bb9af7, #7aa2f7)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                ✨ 신규 기획 (시놉시스 생성)
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">디스크 집필 소설 폴더 선택</label>
              <select
                className="form-select"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                {diskFolders.map((f, i) => (
                  <option key={i} value={f.path}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">TTS 목소리</label>
              <select
                className="form-select"
                value={oneTouchVoice}
                onChange={(e) => setOneTouchVoice(e.target.value)}
              >
                <option value="ko-KR-InJoonNeural">
                  Standard InJoon (인준 - 남성)
                </option>
                <option value="ko-KR-HyunsuMultilingualNeural">
                  Standard Hyunsu (현수 - 남성)
                </option>
                <option value="ko-KR-SunHiNeural">
                  Standard SunHi (선희 - 여성)
                </option>
                <option value="onyx">Premium Onyx (OpenAI Onyx - 남성)</option>
                <option value="echo">Premium Echo (OpenAI Echo - 남성)</option>
                <option value="fable">
                  Premium Fable (OpenAI Fable - 남성)
                </option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">음높이 (Pitch)</label>
              <input
                className="form-input"
                value={oneTouchPitch}
                onChange={(e) => setOneTouchPitch(e.target.value)}
                placeholder="-6Hz"
              />
            </div>
            <div className="form-group">
              <label className="form-label">속도 (Rate)</label>
              <input
                className="form-input"
                value={oneTouchRate}
                onChange={(e) => setOneTouchRate(e.target.value)}
                placeholder="-6%"
              />
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div
              className="form-group"
              style={{ flexDirection: "row", gap: 20, paddingTop: 10 }}
            >
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={oneTouchAutoThumbnail}
                  onChange={(e) => setOneTouchAutoThumbnail(e.target.checked)}
                />
                1화 표지 일러스트 자동 생성
              </label>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  color: "#ff2a5f",
                }}
              >
                <input
                  type="checkbox"
                  checked={oneTouchIsMembershipOnly}
                  onChange={(e) =>
                    setOneTouchIsMembershipOnly(e.target.checked)
                  }
                />
                👑 멤버십 전용으로 등록
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">오디오 특수필터</label>
              <select
                className="form-select"
                value={oneTouchEffect}
                onChange={(e) => setOneTouchEffect(e.target.value)}
              >
                <option value="none">없음 (기본)</option>
                <option value="echo">🏛️ 웅장한 동굴 울림</option>
                <option value="radio">📻 옛날 라디오/통신기</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">목소리 연기/낭독 가이드</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={oneTouchVoiceGuide}
              onChange={(e) => setOneTouchVoiceGuide(e.target.value)}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {/* 실시간 로그 콘솔 */}
          {logs.length > 0 && (
            <div
              style={{
                background: "#030305",
                border: "1px solid rgba(255, 42, 95, 0.2)",
                borderRadius: 12,
                padding: 16,
                fontFamily: "monospace",
                fontSize: 12,
                maxHeight: 280,
                overflowY: "auto",
                color: "#9ece6a",
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)",
              }}
            >
              <div
                style={{
                  color: "#7aa2f7",
                  fontWeight: "bold",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  paddingBottom: 4,
                  marginBottom: 8,
                }}
              >
                💻 AUTOMATION LIVE MONITORING CONSOLE
              </div>
              {logs.map((log, i) => {
                let color = "#c0caf5";
                if (log.type === "success") color = "#9ece6a";
                if (log.type === "error") color = "#f7768e";
                if (log.type === "info") color = "#7aa2f7";
                if (log.type === "debug") color = "#bb9af7";
                if (log.type === "stderr") color = "#e0af68";
                return (
                  <div
                    key={i}
                    style={{ color, marginBottom: 4, lineHeight: 1.4 }}
                  >
                    [{log.time}] {log.message}
                  </div>
                );
              })}
              <div ref={consoleEndRef} />
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: "bold",
                color: runTts ? "#9ece6a" : "rgba(255,255,255,0.6)",
              }}
            >
              <input
                type="checkbox"
                checked={runTts}
                onChange={(e) => setRunTts(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#ff2a5f" }}
              />
              ✅ TTS 및 오디오 연성 함께 진행 (체크 해제 시 글 집필만 진행됨)
            </label>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleRunOneTouchAutomation}
              className="btn-submit"
              disabled={oneTouchRunning}
              style={{
                flex: 3,
                background: "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)",
                boxShadow: "0 0 15px rgba(255, 42, 95, 0.4)",
              }}
            >
              {oneTouchRunning
                ? "🔄 파이프라인 가동 및 자동 연속 집필 중..."
                : "🚀 자동 소설 집필 & 오디오 배포 시작 (원터치)"}
            </button>
            {oneTouchRunning && (
              <button
                type="button"
                onClick={handleStopOneTouchAutomation}
                className="btn-submit"
                disabled={oneTouchStopRequested}
                style={{
                  flex: 1,
                  background:
                    "linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%)",
                  boxShadow: "0 0 15px rgba(255, 59, 48, 0.4)",
                  color: "#fff",
                }}
              >
                {oneTouchStopRequested
                  ? "🛑 중지 중..."
                  : "🛑 긴급 중지 (Stop)"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 신규 기획(시놉시스 생성) 모달 */}
      {planModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#1a1b26",
              padding: 30,
              borderRadius: 16,
              width: "600px",
              maxWidth: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              border: "1px solid rgba(187, 154, 247, 0.4)",
            }}
          >
            <h3
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 20,
                color: "#bb9af7",
              }}
            >
              ✨ 신규 작품 기획 (시놉시스 무작위 생성)
            </h3>

            {/* Show error if any */}
            {planError && (
              <div
                style={{
                  color: "#f7768e",
                  marginBottom: 20,
                  padding: 10,
                  background: "rgba(247, 118, 142, 0.1)",
                  borderRadius: 8,
                }}
              >
                {planError}
              </div>
            )}

            {!planResult && !planLoading && (
              <div
                style={{
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                아직 무슨 작품이 쓰여질지 모릅니다.
                <br />
                AI가 무작위로 매칭된 분위기와 플롯에 맞춰 100화 분량의 거대한
                기획안을 도출해냅니다.
                <br />
                마음에 드는 기획이 나올 때까지 부담 없이 돌려보며 구상해 보세요!
                (※ 텍스트 생성에 소량의 Gemini API 토큰은 소모되지만, 값비싼 TTS
                음원 비용은 확정 전까지 발생하지 않습니다.)
              </div>
            )}

            {planLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
                <div>위대한 대서사시를 구상 중입니다... (1~2분 소요)</div>
              </div>
            )}

            {planResult && !planLoading && (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontWeight: "bold", color: "#7aa2f7" }}>
                    📌 장르/스타일:
                  </span>{" "}
                  {planResult.selected_style?.mood}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontWeight: "bold", color: "#7aa2f7" }}>
                    📚 제목:
                  </span>{" "}
                  <span style={{ fontSize: 18, fontWeight: "bold" }}>
                    {planResult.novel_title}
                  </span>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontWeight: "bold", color: "#7aa2f7" }}>
                    📖 소개글:
                  </span>
                  <div
                    style={{
                      marginTop: 8,
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {planResult.novel_intro}
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontWeight: "bold", color: "#7aa2f7" }}>
                    전체 흐름 (4페이즈):
                  </span>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 8,
                      maxHeight: 200,
                      overflowY: "auto",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {Object.entries(planResult.synopses || {})
                      .filter(
                        ([k]) =>
                          [
                            "1",
                            "26",
                            "51",
                            "76",
                            "10",
                            "20",
                            "30",
                            "40",
                          ].includes(k) || Number(k) % 25 === 1,
                      )
                      .map(([key, value]) => (
                        <div key={key} style={{ marginBottom: 12 }}>
                          <span
                            style={{ color: "#bb9af7", fontWeight: "bold" }}
                          >
                            {key}화 즈음:
                          </span>{" "}
                          {String(value)}
                        </div>
                      ))}
                    <div
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontStyle: "italic",
                        marginTop: 8,
                      }}
                    >
                      ... 등 총 100화 분량의 세부 흐름이 준비되었습니다.
                    </div>
                  </div>
                </div>

                {/* Confirm Final Folder Name */}
                <div
                  className="form-group"
                  style={{
                    marginBottom: 0,
                    padding: 16,
                    background: "rgba(187, 154, 247, 0.1)",
                    borderRadius: 8,
                    border: "1px solid rgba(187, 154, 247, 0.3)",
                  }}
                >
                  <label
                    className="form-label"
                    style={{ color: "#bb9af7", fontSize: 14 }}
                  >
                    ✅ 승인 전, 저장할 작품의 폴더명(ID)을 확인/수정해주세요
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={planFolderName}
                    onChange={(e) => setPlanFolderName(e.target.value)}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      marginTop: 6,
                      display: "block",
                    }}
                  >
                    이름에 한글이 포함되어 있어도 백엔드에서 자동으로 영문 ID로
                    변환하여 R2 및 DB에 안전하게 저장됩니다.
                  </span>
                </div>
              </div>
            )}

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setPlanModalOpen(false)}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>

              {!planResult ? (
                <button
                  onClick={handleCreatePlan}
                  disabled={planLoading}
                  style={{
                    padding: "10px 20px",
                    background: "#bb9af7",
                    border: "none",
                    borderRadius: 8,
                    color: "#000",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  기획 생성 시작
                </button>
              ) : (
                <button
                  onClick={handleAcceptPlan}
                  style={{
                    padding: "10px 20px",
                    background: "#9ece6a",
                    border: "none",
                    borderRadius: 8,
                    color: "#000",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ✅ 승인 및 이 작품으로 선택
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 서브 탭 2: 개별 오디오 연성 (Legacy) --- */}
      {subTab === "legacy-tts" && (
        <form onSubmit={handleTtsSubmit} className="card-panel">
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
            🎙️ TTS 오디오 개별 연성기 (edge-tts)
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            소설 텍스트 파일을 첨부하거나 직접 입력하여 오디오 파일(.mp3)을
            생성하고, R2 업로드 및 DB 발행 작업을 단일 실행합니다.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">대상 소설 작품 선택</label>
              <select
                className="form-select"
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
              >
                {worksList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">공개 예정 일시</label>
              <input
                type="datetime-local"
                className="form-input"
                value={episodeReleaseDate}
                onChange={(e) => setEpisodeReleaseDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">멤버십 전용 설정</label>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  height: "42px",
                  color: "#ff2a5f",
                }}
              >
                <input
                  type="checkbox"
                  checked={ttsIsMembershipOnly}
                  onChange={(e) => setTtsIsMembershipOnly(e.target.checked)}
                />
                👑 멤버십 전용으로 지정
              </label>
            </div>
          </div>

          {/* ✅ 단일 파일/직접입력일 때만 회차번호·제목 입력란 표시 */}
          {txtFileQueue.length === 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">회차 번호 (숫자)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1"
                  value={episodeId}
                  onChange={(e) => setEpisodeId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">회차 제목</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1화: 강호에 피는 꽃"
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">잠금 상태 설정</label>
                <select
                  className="form-select"
                  value={episodeLocked}
                  onChange={(e) => setEpisodeLocked(e.target.value as any)}
                >
                  <option value="auto">작품 설정에 따라 자동 무료/유료 분리</option>
                  <option value="free">🔓 전체 무료회차로 지정</option>
                  <option value="locked">🔒 전체 유료회차로 지정</option>
                </select>
              </div>
            </div>
          )}

          {/* ✅ 여러 파일 큐 리스트 */}
          {txtFileQueue.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📋 파일별 연성 대기열 ({txtFileQueue.length}개) — 파일명에서 자동 파싱됨</span>
                {ttsStatus !== "tts" && (
                  <button type="button" onClick={() => { setTxtFileQueue([]); setTxtFiles([]); }}
                    style={{ background: "rgba(255,59,48,0.15)", border: "1px solid #ff3b30", color: "#ff453a", padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                    목록 비우기
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {txtFileQueue.map((item, i) => {
                  const isRunning = item.status === "running";
                  const isSuccess = item.status === "success";
                  const isError = item.status === "error";
                  const sc = isRunning ? "#fca834" : isSuccess ? "#34c759" : isError ? "#ff453a" : "rgba(255,255,255,0.4)";
                  const st = isRunning ? "연성 중..." : isSuccess ? "완료 ✅" : isError ? "실패" : "대기 중";
                  return (
                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isSuccess ? "rgba(52,199,89,0.3)" : isRunning ? "#fca834" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, background: sc + "1a", color: sc, border: `1px solid ${sc}`, padding: "2px 8px", borderRadius: 6 }}>{st}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.file.name}</span>
                        {isError && item.errorMsg && <span style={{ fontSize: 11, color: "#ff453a" }}>⚠️ {item.errorMsg}</span>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>회차 번호</label>
                          <input type="text" className="form-input" style={{ padding: "4px 8px", fontSize: 13 }}
                            value={item.episodeId} disabled={isRunning || isSuccess}
                            onChange={(e) => setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, episodeId: e.target.value } : q))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 11, opacity: 0.6 }}>회차 제목</label>
                          <input type="text" className="form-input" style={{ padding: "4px 8px", fontSize: 13 }}
                            value={item.episodeTitle} disabled={isRunning || isSuccess}
                            onChange={(e) => setTxtFileQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, episodeTitle: e.target.value } : q))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 잠금 상태는 큐 전체 공유 */}
              <div className="form-group" style={{ marginTop: 12, maxWidth: 320 }}>
                <label className="form-label">잠금 상태 설정 (전체 파일 공통)</label>
                <select className="form-select" value={episodeLocked} onChange={(e) => setEpisodeLocked(e.target.value as any)}>
                  <option value="auto">작품 설정에 따라 자동 무료/유료 분리</option>
                  <option value="free">🔓 전체 무료회차로 지정</option>
                  <option value="locked">🔒 전체 유료회차로 지정</option>
                </select>
              </div>
            </div>
          )}

          {/* 목소리 프리셋 조절 */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: 18,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              🔊 성우 및 목소리 톤 프리셋
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { id: "karisma", label: "🗡️ 카리스마 무협 (인준, 동굴음)" },
                { id: "oe-yu", label: "🦉 외유내강 (현수, 고결함)" },
                { id: "cave", label: "🌲 진중 판타지 (인준, 느림)" },
                { id: "romance", label: "🌸 로맨스 남주 (현수, 부드러움)" },
                {
                  id: "modern-fantasy",
                  label: "⚡ 현대 판타지 (현수, 지루함없음)",
                },
                { id: "furious", label: "🔥 분노/화남 (빠르고 날카롭게)" },
                { id: "calm", label: "🍃 차분/따뜻 (느리고 포근하게)" },
                { id: "custom", label: "⚙️ 사용자 직접 조절" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    background:
                      preset === p.id
                        ? "linear-gradient(135deg, #ff2a5f 0%, #ff7f00 100%)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      preset === p.id
                        ? "1px solid #ff2a5f"
                        : "1px solid rgba(255,255,255,0.12)",
                    color: preset === p.id ? "white" : "rgba(255,255,255,0.7)",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">AI 성우 선택</label>
                <select
                  className="form-select"
                  value={voice}
                  onChange={(e) => {
                    setVoice(e.target.value);
                    setPreset("custom");
                  }}
                  disabled={preset !== "custom"}
                >
                  <optgroup label="무료 성우 (Microsoft Edge)">
                    <option value="ko-KR-InJoonNeural">
                      Standard InJoon (인준)
                    </option>
                    <option value="ko-KR-HyunsuMultilingualNeural">
                      Standard Hyunsu (현수)
                    </option>
                    <option value="ko-KR-SunHiNeural">
                      Standard SunHi (선희)
                    </option>
                  </optgroup>
                  <optgroup label="구글 클라우드 프리미엄 (Premium GC)">
                    <option value="ko-KR-Neural2-B">
                      Premium Neural2-B (남성)
                    </option>
                    <option value="ko-KR-Neural2-C">
                      Premium Neural2-C (여성)
                    </option>
                  </optgroup>
                  <optgroup label="OpenAI 프리미엄 (Premium OpenAI)">
                    <option value="onyx">Premium Onyx (남성)</option>
                    <option value="echo">Premium Echo (남성)</option>
                    <option value="fable">Premium Fable (남성)</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  🔊 특수 효과음 필터 (FFmpeg)
                </label>
                <select
                  className="form-select"
                  value={effect}
                  onChange={(e) => setEffect(e.target.value)}
                >
                  <option value="none">없음 (기본 목소리)</option>
                  <option value="echo">🏛️ 웅장한 울림 (동굴/독백 효과)</option>
                  <option value="radio">📻 무전기/전화기 (기계적 감쇠)</option>
                  <option value="robot">🤖 기계음/로봇 (SF 괴물 효과)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 16,
              }}
            >
              <div className="form-group">
                <label className="form-label">음높이 (Pitch): {pitch}</label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={
                    preset === "custom" ? customPitchVal : parseInt(pitch) || 0
                  }
                  disabled={preset !== "custom"}
                  onChange={(e) =>
                    handleCustomPitchChange(Number(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">속도 (Rate): {rate}</label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={
                    preset === "custom" ? customRateVal : parseInt(rate) || 0
                  }
                  disabled={preset !== "custom"}
                  onChange={(e) =>
                    handleCustomRateChange(Number(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">
                🎙️ 목소리 감정 및 연기 가이드
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                value={voiceGuide}
                onChange={(e) => setVoiceGuide(e.target.value)}
                style={{ fontFamily: "monospace" }}
              />
            </div>

            {/* 톤 미리듣기 테스트 */}
            <div
              style={{
                marginTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 16,
              }}
            >
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label
                  className="form-label"
                  style={{ fontSize: 12, opacity: 0.8 }}
                >
                  미리듣기 테스트 문장
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
              </div>

              {isPreviewPlaying && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 12px",
                    background: "rgba(255,215,0,0.08)",
                    borderRadius: 8,
                    border: "1px solid rgba(255,215,0,0.25)",
                    fontSize: 12,
                    color: "#ffd700",
                  }}
                >
                  ⚡ 위 <strong>음높이 · 속도</strong> 슬라이더를 움직이면 지금
                  재생 중인 음성에 즉시 반영됩니다.
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePlayPreview}
                  disabled={previewLoading}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: "8px",
                    border: "none",
                    background: isPreviewPlaying ? "#ff3b30" : "#ffd700",
                    color: isPreviewPlaying ? "white" : "#2b1d00",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {previewLoading
                    ? "🔊 생성 중..."
                    : isPreviewPlaying
                      ? "⏹️ 정지"
                      : "🎧 톤 미리듣기"}
                </button>
                {previewAudioBuffer && (
                  <button
                    type="button"
                    onClick={handleReplayPreview}
                    disabled={previewLoading}
                    className="form-input"
                    style={{
                      height: 40,
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🔁 다시듣기
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">소설 본문 텍스트 파일 (.txt)</label>
              <input
                type="file"
                accept=".txt"
                multiple
                onChange={handleTxtFileChange}
                className="form-input"
              />
            </div>
            {txtFiles.length > 0 && (
              <div
                style={{
                  alignSelf: "center",
                  fontSize: 13,
                  color: "#34c759",
                  fontWeight: 700,
                }}
              >
                ✅ {txtFiles.length}개 파일 로드 완료
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              본문 텍스트 직접 입력/수정 (본문 {textInput.length}글자)
            </label>
            <textarea
              className="form-textarea"
              rows={8}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>

          {ttsStatus !== "idle" && (
            <div
              style={{
                background:
                  ttsStatus === "success"
                    ? "rgba(52,199,89,0.1)"
                    : ttsStatus === "error"
                      ? "rgba(255,59,48,0.1)"
                      : "rgba(252,168,52,0.1)",
                border: `1px solid ${ttsStatus === "success" ? "#34c759" : ttsStatus === "error" ? "#ff3b30" : "#fca834"}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color:
                    ttsStatus === "success"
                      ? "#34c759"
                      : ttsStatus === "error"
                        ? "#ff3b30"
                        : "#fca834",
                }}
              >
                {ttsStatus === "tts" &&
                  "🎙️ AI 성우가 소설을 낭독하는 중입니다..."}
                {ttsStatus === "upload" &&
                  "☁️ 생성된 오디오를 Cloudflare R2에 업로드 중..."}
                {ttsStatus === "db" &&
                  "💾 데이터베이스에 에피소드를 등록 중..."}
                {ttsStatus === "success" &&
                  "🎉 [성공] 오디오 연성 및 발행이 완료되었습니다!"}
                {ttsStatus === "error" && `❌ 에러 발생: ${errorMsg}`}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={
              ttsStatus === "tts" ||
              ttsStatus === "upload" ||
              ttsStatus === "db"
            }
          >
            {ttsStatus === "tts" || ttsStatus === "upload" || ttsStatus === "db"
              ? "🔄 진행 중..."
              : "🚀 오디오 개별 연성 및 홈페이지 반영 시작"}
          </button>
        </form>
      )}

      {/* --- 서브 탭 3: 합본 분할 연성 (Batch TTS) --- */}
      {subTab === "batch-tts" && (
        <div className="card-panel">
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
            📝 합본 소설 분할 및 일괄 오디오 연성기 (Split & Batch TTS)
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            [ 1화_제목 ] 등 대괄호로 분리된 합본 소설 텍스트 파일(.txt)을
            업로드하면 자동으로 각 화로 분할하고 순차적으로 오디오를 일괄
            생성하여 배포합니다.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">대상 소설 작품 선택</label>
              <select
                className="form-select"
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
              >
                {worksList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">합본 소설 텍스트 파일 업로드</label>
              <input
                type="file"
                accept=".txt"
                onChange={handleSplitFileChange}
                className="form-input"
                disabled={batchStatus === "running"}
              />
            </div>
          </div>

          {parsedChapters.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
                📋 파싱된 회차 목록 ({parsedChapters.length}개)
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div className="form-group">
                  <label className="form-label">예약 발행 방식 설정</label>
                  <select
                    className="form-select"
                    value={schedulingType}
                    onChange={(e) => setSchedulingType(e.target.value as any)}
                    disabled={batchStatus === "running"}
                  >
                    <option value="immediate">즉시 공개 (동시 발행)</option>
                    <option value="1hour">1시간 간격 순차 발행</option>
                    <option value="12hour">12시간 간격 순차 발행</option>
                    <option value="1day">1일 간격 순차 발행</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    첫 회차 발행 예정 일시 (기준 시간)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={schedulingStartDate}
                    onChange={(e) => setSchedulingStartDate(e.target.value)}
                    required
                    disabled={batchStatus === "running"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">잠금 설정 (유료/무료)</label>
                  <select
                    className="form-select"
                    value={episodeLocked}
                    onChange={(e) => setEpisodeLocked(e.target.value as any)}
                    disabled={batchStatus === "running"}
                  >
                    <option value="auto">
                      작품 설정에 따라 자동 무료/유료 분리
                    </option>
                    <option value="free">🔓 전체 무료회차로 지정</option>
                    <option value="locked">🔒 전체 유료회차로 지정</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  maxHeight: 300,
                  overflowY: "auto",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  padding: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 16,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      <th style={{ padding: "8px 4px", width: "80px" }}>
                        회차 번호
                      </th>
                      <th style={{ padding: "8px 4px" }}>회차 제목</th>
                      <th style={{ padding: "8px 4px", width: "100px" }}>
                        본문 글자수
                      </th>
                      <th style={{ padding: "8px 4px", width: "100px" }}>
                        상태
                      </th>
                      <th style={{ padding: "8px 4px", width: "80px" }}>
                        잠금 구분
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedChapters.map((chapter, idx) => {
                      const statusInfo = itemStatuses[idx] || {
                        status: "idle",
                      };
                      const isCurrent =
                        idx === currentBatchIndex && batchStatus === "running";
                      const actualLocked = getEpisodeLockedStatus(chapter.id);

                      let badgeColor = "rgba(255,255,255,0.3)";
                      let badgeText = "대기";
                      if (statusInfo.status === "running") {
                        badgeColor = "#fca834";
                        badgeText = "연성 중...";
                      } else if (statusInfo.status === "success") {
                        badgeColor = "#34c759";
                        badgeText = "완료";
                      } else if (statusInfo.status === "error") {
                        badgeColor = "#ff453a";
                        badgeText = "실패";
                      }

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: isCurrent
                              ? "rgba(255, 42, 95, 0.08)"
                              : "transparent",
                          }}
                        >
                          <td style={{ padding: "6px 4px" }}>
                            <input
                              type="text"
                              value={chapter.id}
                              onChange={(e) =>
                                updateParsedChapter(idx, "id", e.target.value)
                              }
                              disabled={batchStatus === "running"}
                              style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "4px",
                                color: "white",
                                padding: "4px",
                                fontSize: "12px",
                                textAlign: "center",
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            <input
                              type="text"
                              value={chapter.title}
                              onChange={(e) =>
                                updateParsedChapter(
                                  idx,
                                  "title",
                                  e.target.value,
                                )
                              }
                              disabled={batchStatus === "running"}
                              style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "4px",
                                color: "white",
                                padding: "4px 8px",
                                fontSize: "12px",
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px 4px", opacity: 0.7 }}>
                            {chapter.text.length.toLocaleString()} 자
                          </td>
                          <td style={{ padding: "8px 4px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: "bold",
                                color: badgeColor,
                                background: badgeColor + "1a",
                                border: `1px solid ${badgeColor}`,
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                              title={statusInfo.errorMsg}
                            >
                              {badgeText}
                            </span>
                          </td>
                          <td style={{ padding: "8px 4px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: actualLocked ? "#ff453a" : "#34c759",
                              }}
                            >
                              {actualLocked ? "🔒 유료" : "🔓 무료"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 일괄 컨트롤러 */}
              <div style={{ display: "flex", gap: 12 }}>
                {batchStatus === "idle" && (
                  <button
                    type="button"
                    onClick={() => runBatch(0)}
                    className="btn-submit"
                    style={{ flex: 1 }}
                  >
                    🚀 일괄 오디오 연성 시작 ({parsedChapters.length}개 회차)
                  </button>
                )}
                {batchStatus === "running" && (
                  <button
                    type="button"
                    onClick={pauseBatch}
                    className="btn-submit"
                    style={{
                      flex: 1,
                      background:
                        "linear-gradient(135deg, #fca834 0%, #ff7f00 100%)",
                    }}
                  >
                    ⏸️ 일괄 연성 일시 정지 (현재 {currentBatchIndex + 1}번째
                    진행 중)
                  </button>
                )}
                {batchStatus === "paused" && (
                  <>
                    <button
                      type="button"
                      onClick={resumeBatch}
                      className="btn-submit"
                      style={{ flex: 1 }}
                    >
                      ▶️ 연성 재개 ({currentBatchIndex + 1}번째부터 시작)
                    </button>
                    <button
                      type="button"
                      onClick={cancelBatch}
                      className="btn-submit"
                      style={{
                        width: "120px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      ❌ 초기화
                    </button>
                  </>
                )}
                {(batchStatus === "success" || batchStatus === "error") && (
                  <button
                    type="button"
                    onClick={cancelBatch}
                    className="btn-submit"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    🔄 목록 초기화 및 완료 확인
                  </button>
                )}
              </div>

              {/* 전체 진행률바 */}
              {batchStatus !== "idle" && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span>전체 일괄 연성 진행도</span>
                    <span>
                      {Math.round(
                        (currentBatchIndex / parsedChapters.length) * 100,
                      )}
                      % ({currentBatchIndex} / {parsedChapters.length})
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${(currentBatchIndex / parsedChapters.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- 서브 탭 4: 텍스트 파일 합포장 (Merger) --- */}
      {subTab === "merger" && (
        <form onSubmit={handleMergeSubmit} className="card-panel">
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
            📦 텍스트 파일 합포장기 (TXT Merger)
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            여러 개의 텍스트 파일(.txt)을 선택하면 파일 이름순으로 정렬하여
            하나의 전체 합본 메모장 파일로 생성 및 다운로드합니다.
          </p>

          <div className="form-group">
            <label className="form-label">
              합포장할 텍스트 파일 선택 (다중 선택 가능)
            </label>
            <input
              type="file"
              accept=".txt"
              multiple
              disabled={merging}
              onChange={(e) => {
                const files = e.target.files;
                if (files) setMergeFiles(Array.from(files));
              }}
              className="form-input"
            />
          </div>

          {mergeFiles.length > 0 && (
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                선택된 파일 목록 ({mergeFiles.length}개)
              </div>
              <div
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {[...mergeFiles]
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { numeric: true }),
                  )
                  .map((f, i) => (
                    <div key={i} style={{ fontSize: 12, opacity: 0.7 }}>
                      {i + 1}. {f.name}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={merging || mergeFiles.length === 0}
          >
            {merging
              ? "🔄 파일 정렬 및 합본 합포장 중..."
              : `50개 회차 메모장 합본 생성 및 다운로드 (${mergeFiles.length}개)`}
          </button>
        </form>
      )}
    </div>
  );
}
