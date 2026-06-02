"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

async function getAccessToken() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

const ATTENDANCE_REWARDS = [
  { day: "오늘", coin: 10 },
  { day: "2일차", coin: 20 },
  { day: "3일차", coin: 20 },
  { day: "4일차", coin: 10 },
  { day: "5일차", coin: 10 },
  { day: "6일차", coin: 25 },
  { day: "7일차", coin: 40 },
];

const EARN_TASKS = [
  {
    id: "ad",
    icon: "🎬",
    title: "보상을 받으세요",
    subtitle: "영상을 보고 코인 20개 획득",
    badge: "(0/20)",
    coin: 20,
    btnLabel: "광고 보기",
    done: false,
  },
  {
    id: "youtube",
    icon: "▶",
    title: "유튜브 채널 구독하기",
    subtitle: "+50 코인",
    coin: 50,
    btnLabel: "구독하기",
    done: false,
  },
  {
    id: "invite",
    icon: "👤",
    title: "친구 초대하기",
    subtitle: "매일 최대 500 코인 획득 가능",
    coin: 500,
    btnLabel: "초대하기",
    done: false,
  },
  {
    id: "share",
    icon: "↪",
    title: "친구에게 공유하기",
    subtitle: "+ 30 코인",
    coin: 30,
    btnLabel: "공유하기",
    done: false,
  },
  {
    id: "watch5",
    icon: "⏱️",
    title: "5분 보기",
    subtitle: "+ 10 코인",
    coin: 10,
    btnLabel: "청취하기",
    done: false,
    minutesRequired: 5,
  },
  {
    id: "watch10",
    icon: "⏱️",
    title: "10분 보기",
    subtitle: "+ 20 코인",
    coin: 20,
    btnLabel: "청취하기",
    done: false,
    minutesRequired: 10,
  },
  {
    id: "watch15",
    icon: "⏱️",
    title: "15분 보기",
    subtitle: "+ 40 코인",
    coin: 40,
    btnLabel: "청취하기",
    done: false,
    minutesRequired: 15,
  },
  {
    id: "more",
    icon: "🎁",
    title: "더 많은 코인 받기",
    subtitle: "최대 999 코인",
    coin: 999,
    btnLabel: "완료",
    done: true,
  },
];

const YT_CHANNEL_URL = "https://www.youtube.com/channel/UCSw1s3kC086lNi9_wcdX3Aw";

export default function CheckinPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});
  const [ytModalOpen, setYtModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 로컬 스토리지에서 오디오 재생 시간 연동
  useEffect(() => {
    const updateWatchTime = () => {
      try {
        const todayStr = new Date().toDateString();
        const saved = localStorage.getItem(`watch_time_${todayStr}`);
        setElapsedSeconds(saved ? Number(saved) : 0);
      } catch (e) {}
    };
    updateWatchTime();
    const interval = setInterval(updateWatchTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/me/wallet", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) setCoins(Number(data.reward_points ?? 0));
      } catch (e) { /* ignore */ }
    };
    if (user) loadWallet();
  }, [user]);

  // Supabase에서 완료된 태스크 로드
  useEffect(() => {
    const loadCompletedTasks = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          // 비로그인: localStorage 폴백
          const savedTasks = localStorage.getItem("checkin_tasks");
          if (savedTasks) setTaskDone(JSON.parse(savedTasks));
          return;
        }
        const res = await fetch("/api/me/tasks", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.completedTasks) {
          const doneMap: Record<string, boolean> = {};
          (data.completedTasks as string[]).forEach((id) => { doneMap[id] = true; });
          setTaskDone(doneMap);
        }
      } catch (e) {
        // 네트워크 오류 시 localStorage 폴백
        const savedTasks = localStorage.getItem("checkin_tasks");
        if (savedTasks) setTaskDone(JSON.parse(savedTasks));
      }
    };
    loadCompletedTasks();
  }, [user]);

  // 출석체크 데이터는 localStorage 유지 (날짜 기반)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkin_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        if (parsed.lastDate === today) {
          setCheckedIn(true);
          setStreak(parsed.streak ?? 0);
        } else {
          setStreak(parsed.streak ?? 0);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  const handleCheckin = () => {
    if (checkedIn) {
      alert("오늘 이미 출석체크를 완료했습니다!");
      return;
    }
    const newStreak = streak + 1;
    const reward = ATTENDANCE_REWARDS[(newStreak - 1) % 7].coin;
    setStreak(newStreak);
    setCheckedIn(true);
    setCoins((prev) => prev + reward);
    try {
      localStorage.setItem("checkin_data", JSON.stringify({
        lastDate: new Date().toDateString(),
        streak: newStreak,
      }));
    } catch (e) { /* ignore */ }
    alert(`출석 완료! +${reward} 코인 적립되었습니다 🎉`);
  };

  const handleTask = (taskId: string, label: string) => {
    if (taskDone[taskId]) return;
    if (label === "광고 보기") {
      alert("광고 기능은 준비중입니다.");
      return;
    }
    if (label === "초대하기") {
      if (navigator.share) {
        navigator.share({ title: "무림북", url: window.location.origin });
      } else {
        alert("친구 초대 링크가 복사되었습니다!");
      }
      return;
    }
    if (label === "구독하기") {
      // 유튜브 채널 새 탭으로 열기
      window.open(YT_CHANNEL_URL, "_blank", "noopener,noreferrer");
      // 구독 확인 모달 오픈
      setYtModalOpen(true);
      return;
    }
    if (label === "공유하기") {
      if (navigator.share) {
        navigator.share({ title: "무림북", url: window.location.origin });
      } else {
        alert("공유 링크가 복사되었습니다!");
      }
      return;
    }
    alert("준비중인 기능입니다.");
  };

  // 유튜브 구독 완료 확인 → Supabase 저장 + 코인 지급
  const handleYoutubeConfirm = async () => {
    const YOUTUBE_COIN = 50;
    setYtModalOpen(false);

    try {
      const token = await getAccessToken();

      if (token) {
        // 로그인 상태: Supabase API로 저장 (서버에서 1회성 체크 + 코인 지급)
        const res = await fetch("/api/me/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: "youtube", coin: YOUTUBE_COIN }),
        });
        const data = await res.json().catch(() => null);

        if (res.status === 409) {
          alert("이미 구독 보상을 받으셨습니다.");
          setTaskDone((prev) => ({ ...prev, youtube: true }));
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "서버 오류");
        if (data?.newRewardPoints !== undefined) {
          setCoins(Number(data.newRewardPoints));
        } else {
          setCoins((prev) => prev + YOUTUBE_COIN);
        }
      } else {
        // 비로그인: localStorage 폴백
        setCoins((prev) => prev + YOUTUBE_COIN);
        try {
          const savedTasks = localStorage.getItem("checkin_tasks");
          const existing = savedTasks ? JSON.parse(savedTasks) : {};
          existing.youtube = true;
          localStorage.setItem("checkin_tasks", JSON.stringify(existing));
        } catch (e) { /* ignore */ }
      }

      setTaskDone((prev) => ({ ...prev, youtube: true }));
      alert(`구독 감사합니다! +${YOUTUBE_COIN} 코인이 적립되었습니다 🎉`);
    } catch (e: any) {
      alert(`오류가 발생했습니다: ${e?.message ?? "잠시 후 다시 시도해주세요."}`);
    }
  };

  const handleListenRoute = () => {
    try {
      const lastPlayed = localStorage.getItem("last_played_episode");
      if (lastPlayed) {
        const data = JSON.parse(lastPlayed);
        if (data.workId && data.episodeId) {
          router.push(`/episode/${data.workId}/${data.episodeId}?part=${data.part || 1}`);
          return;
        }
      }
    } catch (e) {}
    router.push("/works");
  };

  // 시청 시간 달성 → 일일 태스크 완료 처리 (Supabase)
  const handleWatchClaim = async (taskId: string, coin: number) => {
    if (taskDone[taskId]) return;
    try {
      const token = await getAccessToken();
      if (token) {
        const res = await fetch("/api/me/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId, coin, daily: true }),
        });
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          alert("오늘 이미 완료한 미션입니다.");
          setTaskDone((prev) => ({ ...prev, [taskId]: true }));
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "서버 오류");
        if (data?.newRewardPoints !== undefined) {
          setCoins(Number(data.newRewardPoints));
        } else {
          setCoins((prev) => prev + coin);
        }
      } else {
        setCoins((prev) => prev + coin);
      }
      setTaskDone((prev) => ({ ...prev, [taskId]: true }));
      alert(`+${coin} 코인이 적립되었습니다! 🎉`);
    } catch (e: any) {
      alert(`오류: ${e?.message ?? "잠시 후 다시 시도해주세요."}`);
    }
  };

  const todayIdx = streak % 7;

  return (
    <main className="ci-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        .ci-root {
          min-height: 100dvh;
          background: #0c0c12;
          color: #ffffff;
          font-family: 'Outfit', ui-sans-serif, system-ui, "Noto Sans KR", Arial;
        }

        .ci-wrap {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 0 60px;
          display: flex;
          flex-direction: column;
        }

        /* ── 헤더 ── */
        .ci-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 56px;
          padding: 0 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .ci-back {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
        }

        .ci-tabs {
          display: flex;
          gap: 32px;
        }

        .ci-tab {
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          padding: 0 0 4px;
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          letter-spacing: -0.2px;
        }

        .ci-tab.active {
          color: #ffffff;
          border-bottom-color: #e8356d;
        }

        .ci-page-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.2px;
        }

        /* ── 코인 히어로 ── */
        .ci-hero {
          position: relative;
          padding: 28px 20px 20px;
          background: linear-gradient(160deg, #1a0e22 0%, #0c0c12 60%);
          overflow: hidden;
        }

        .ci-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,53,109,0.18) 0%, transparent 70%);
        }

        .ci-hero-amount {
          font-size: 44px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -2px;
          line-height: 1;
          margin: 0;
        }

        .ci-hero-label {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          font-weight: 600;
          margin-top: 4px;
        }

        .ci-hero-coin-img {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f9c34a 0%, #e8871a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(249,195,74,0.35);
        }

        .ci-rules-btn {
          position: absolute;
          top: 20px;
          right: 104px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          cursor: pointer;
        }

        .ci-stars {
          position: absolute;
          top: 16px; left: 50%;
          font-size: 14px;
          opacity: 0.3;
          pointer-events: none;
        }

        /* ── 출석 카드 ── */
        .ci-attendance-card {
          margin: 16px 16px 0;
          background: #181825;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px 16px;
        }

        .ci-streak-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 16px;
          letter-spacing: -0.4px;
        }

        .ci-streak-highlight {
          color: #e8356d;
        }

        .ci-days-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          margin-bottom: 16px;
        }

        .ci-days-row::-webkit-scrollbar { display: none; }

        .ci-day-box {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.06);
          min-width: 44px;
          transition: all 0.2s;
        }

        .ci-day-box.today {
          border-color: rgba(232,53,109,0.5);
          background: rgba(232,53,109,0.08);
        }

        .ci-day-box.done {
          background: rgba(249,195,74,0.08);
          border-color: rgba(249,195,74,0.3);
        }

        .ci-day-coin-text {
          font-size: 10px;
          font-weight: 800;
          color: #f9c34a;
          letter-spacing: -0.3px;
        }

        .ci-day-coin-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f9c34a 0%, #e8871a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 3px 8px rgba(249,195,74,0.25);
        }

        .ci-day-icon-grey {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        .ci-day-label {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
        }

        .ci-day-label.today {
          color: #e8356d;
          font-weight: 800;
        }

        .ci-checkin-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(90deg, #e8356d 0%, #f0527a 100%);
          border: none;
          border-radius: 14px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: -0.3px;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 16px rgba(232,53,109,0.35);
        }

        .ci-checkin-btn:active {
          transform: scale(0.98);
          opacity: 0.9;
        }

        .ci-checkin-btn.done {
          background: rgba(255,255,255,0.08);
          box-shadow: none;
          color: rgba(255,255,255,0.4);
          cursor: default;
        }

        /* ── 섹션 타이틀 ── */
        .ci-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 24px 16px 12px;
          letter-spacing: -0.4px;
        }

        /* ── 태스크 리스트 ── */
        .ci-task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 16px;
        }

        .ci-task-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #181825;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 14px 16px;
          transition: border-color 0.2s;
        }

        .ci-task-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .ci-task-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .ci-task-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ci-task-title-badge {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          margin-left: 4px;
        }

        .ci-task-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
        }

        .ci-task-sub .coin-highlight {
          color: #f9c34a;
          font-weight: 800;
        }

        .ci-task-btn {
          flex-shrink: 0;
          background: linear-gradient(90deg, #e8356d 0%, #f0527a 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          padding: 8px 14px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(232,53,109,0.3);
        }

        .ci-task-btn:active {
          transform: scale(0.95);
          opacity: 0.9;
        }

        .ci-task-btn.done-btn {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35);
          box-shadow: none;
          cursor: default;
        }

        .ci-task-btn.listen-btn {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          box-shadow: none;
          cursor: pointer;
        }

        .ci-task-btn.claim-btn {
          background: linear-gradient(90deg, #ff2a5f 0%, #ff7a3c 100%);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(255, 42, 95, 0.35);
          animation: claimPulse 1.5s ease-in-out infinite;
        }

        @keyframes claimPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(255, 42, 95, 0.35); }
          50% { transform: scale(1.05); box-shadow: 0 4px 24px rgba(255, 42, 95, 0.5); }
        }

        /* ── 시청 타이머 진행 바 ── */
        .watch-progress-wrap {
          margin-top: 8px;
          width: 100%;
        }

        .watch-bar-track {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
        }

        .watch-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #e8356d 0%, #f9c34a 100%);
          border-radius: 99px;
          transition: width 1s linear;
        }

        .watch-bar-fill.complete {
          background: linear-gradient(90deg, #ff2a5f 0%, #ff7a3c 100%);
        }

        .watch-timer-text {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          margin-top: 6px;
        }

        .watch-timer-text.ready {
          color: #ff7a3c;
        }

        /* 멤버십 탭 */
        .ci-membership-placeholder {
          margin: 40px 16px;
          background: #181825;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .ci-mp-icon {
          font-size: 48px;
        }

        .ci-mp-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .ci-mp-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        .ci-mp-btn {
          background: linear-gradient(90deg, #e8356d 0%, #f0527a 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          padding: 12px 28px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(232,53,109,0.35);
          margin-top: 8px;
        }
        /* ── 유튜브 모달 ── */
        .yt-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .yt-modal-sheet {
          width: 100%;
          max-width: 480px;
          background: #1a1a28;
          border-radius: 24px 24px 0 0;
          padding: 28px 20px calc(28px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: slideUp 0.28s cubic-bezier(0.4,0,0.2,1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .yt-modal-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.15);
          margin-bottom: 4px;
        }

        .yt-modal-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 6px 20px rgba(255,0,0,0.3);
        }

        .yt-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          text-align: center;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .yt-modal-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          line-height: 1.6;
          margin: 0;
        }

        .yt-modal-coin-badge {
          background: rgba(249,195,74,0.12);
          border: 1px solid rgba(249,195,74,0.3);
          border-radius: 20px;
          padding: 8px 20px;
          font-size: 15px;
          font-weight: 800;
          color: #f9c34a;
          letter-spacing: -0.3px;
        }

        .yt-modal-confirm-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(90deg, #e8356d 0%, #f0527a 100%);
          border: none;
          border-radius: 14px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(232,53,109,0.35);
          transition: opacity 0.2s, transform 0.1s;
          letter-spacing: -0.3px;
        }

        .yt-modal-confirm-btn:active {
          transform: scale(0.98);
          opacity: 0.9;
        }

        .yt-modal-cancel-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px;
        }

        /* ── 규칙 모달 ── */
        .rules-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }

        .rules-modal-box {
          width: 100%;
          max-width: 360px;
          background: #181825;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          animation: scaleUp 0.2s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          position: relative;
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .rules-modal-header {
          padding: 24px 20px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .rules-modal-title {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .rules-modal-close {
          position: absolute;
          top: 18px;
          right: 20px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .rules-modal-content {
          padding: 0 24px 28px;
          max-height: 60vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rules-modal-content::-webkit-scrollbar {
          width: 4px;
        }
        .rules-modal-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .rules-modal-content::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        .rules-modal-item {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
          word-break: keep-all;
        }
      `}</style>

      <div className="ci-wrap">
        {/* 헤더 */}
        <div className="ci-header">
          <button className="ci-back" onClick={() => router.back()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="ci-page-title">리워드 코인</h1>
        </div>

        {/* 코인 히어로 */}
            <div className="ci-hero">
              <p className="ci-hero-amount">{coins.toLocaleString()}</p>
              <p className="ci-hero-label">내 코인</p>
              <button className="ci-rules-btn" onClick={() => setRulesModalOpen(true)}>코인 받기 규칙</button>
              <div className="ci-hero-coin-img">🪙</div>
              <span className="ci-stars">✦ ✦</span>
            </div>

            {/* 출석 카드 */}
            <div className="ci-attendance-card">
              <p className="ci-streak-title">
                누적 출석 <span className="ci-streak-highlight">{streak}일</span>
              </p>

              {/* 7일 달력 */}
              <div className="ci-days-row">
                {ATTENDANCE_REWARDS.map((item, idx) => {
                  const isDone = idx < (streak % 7 === 0 && streak > 0 ? 7 : streak % 7);
                  const isToday = idx === todayIdx && !checkedIn;

                  return (
                    <div
                      key={idx}
                      className={`ci-day-box ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}
                    >
                      <span className="ci-day-coin-text">+{item.coin}</span>
                      {isDone ? (
                        <div className="ci-day-coin-icon">✓</div>
                      ) : isToday ? (
                        <div className="ci-day-coin-icon">🪙</div>
                      ) : (
                        <div className="ci-day-icon-grey">🪙</div>
                      )}
                      <span className={`ci-day-label ${isToday ? "today" : ""}`}>{item.day}</span>
                    </div>
                  );
                })}
              </div>

              {/* 출석 버튼 */}
              <button
                className={`ci-checkin-btn ${checkedIn ? "done" : ""}`}
                onClick={handleCheckin}
              >
                {checkedIn ? "오늘 출석 완료 ✓" : "출석체크"}
              </button>
            </div>

            {/* 코인 받기 섹션 */}
            <p className="ci-section-title">코인 받기</p>
            <div className="ci-task-list">
              {EARN_TASKS
                .filter((task) => !(task.id === "youtube" && taskDone["youtube"]))
                .map((task) => {
                  const isDone = task.done || !!taskDone[task.id];
                  const isTimerTask = !!(task as any).minutesRequired;
                  const requiredSecs = ((task as any).minutesRequired ?? 0) * 60;
                  const progress = isTimerTask ? Math.min(100, (elapsedSeconds / requiredSecs) * 100) : 100;
                  const canClaim = isTimerTask && elapsedSeconds >= requiredSecs;

                  const fmtTime = (s: number) =>
                    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

                  return (
                    <div className="ci-task-card" key={task.id}>
                      <div className="ci-task-icon-wrap">{task.icon}</div>
                      <div className="ci-task-info">
                        <span className="ci-task-title">
                          {task.title}
                          {task.badge && <span className="ci-task-title-badge">{task.badge}</span>}
                        </span>
                        <span className="ci-task-sub">
                          {task.subtitle.includes("코인") ? (
                            <>
                              {task.subtitle.replace(/\d+\s*코인/, "")}{" "}
                              <span className="coin-highlight">{task.coin} 코인</span>
                            </>
                          ) : (
                            task.subtitle
                          )}
                        </span>
                        {isTimerTask && !isDone && (
                          <div className="watch-progress-wrap">
                            <div className="watch-bar-track">
                              <div
                                className={`watch-bar-fill${canClaim ? " complete" : ""}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className={`watch-timer-text${canClaim ? " ready" : ""}`}>
                              {canClaim
                                ? "✓ 미션 달성 완료!"
                                : `${fmtTime(elapsedSeconds)} / ${(task as any).minutesRequired}:00`}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        className={`ci-task-btn ${
                          isDone ? "done-btn" :
                          isTimerTask && !canClaim ? "listen-btn" :
                          isTimerTask && canClaim ? "claim-btn" : ""
                        }`}
                        onClick={() => {
                          if (isDone) return;
                          if (isTimerTask && !canClaim) {
                            handleListenRoute();
                            return;
                          }
                          if (isTimerTask && canClaim) {
                            handleWatchClaim(task.id, task.coin);
                          } else {
                            handleTask(task.id, task.btnLabel);
                          }
                        }}
                      >
                        {isDone ? "완료" : isTimerTask && canClaim ? "청취완료" : task.btnLabel}
                      </button>
                    </div>
                  );
                })}
            </div>

      </div>

      {/* 유튜브 구독 확인 모달 */}
      {ytModalOpen && (
        <div className="yt-modal-overlay" onClick={() => setYtModalOpen(false)}>
          <div className="yt-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="yt-modal-handle" />
            <div className="yt-modal-icon">▶</div>
            <h2 className="yt-modal-title">유튜브 채널을 구독하셨나요?</h2>
            <p className="yt-modal-desc">
              무림북 공식 유튜브 채널을 구독하시면<br />
              코인이 즉시 지급됩니다.
            </p>
            <div className="yt-modal-coin-badge">🪙 +50 코인 지급</div>
            <button className="yt-modal-confirm-btn" onClick={handleYoutubeConfirm}>
              구독 완료했어요!
            </button>
            <button className="yt-modal-cancel-btn" onClick={() => setYtModalOpen(false)}>
              아직 구독하지 않았어요
            </button>
          </div>
        </div>
      )}

      {/* 리워드 안내 (코인 받기 규칙) 모달 */}
      {rulesModalOpen && (
        <div className="rules-modal-overlay" onClick={() => setRulesModalOpen(false)}>
          <div className="rules-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rules-modal-header">
              <h2 className="rules-modal-title">리워드 안내</h2>
              <button className="rules-modal-close" onClick={() => setRulesModalOpen(false)}>×</button>
            </div>
            <div className="rules-modal-content">
              <div className="rules-modal-item">
                1. 리워드 코인은 다양한 미션과 출석체크를 통해 획득할 수 있습니다.
              </div>
              <div className="rules-modal-item">
                2. 출석은 하루에 한 번만 가능합니다.
              </div>
              <div className="rules-modal-item">
                3. 로그인하지 않아 출석이 끊길 경우, 출석 일수는 1일차로 초기화됩니다.
              </div>
              <div className="rules-modal-item">
                4. 리워드 코인은 드라마 잠금 해제에만 사용할 수 있으며, 사용 내역은 내 지갑에서 확인할 수 있습니다.
              </div>
              <div className="rules-modal-item">
                5. 드라마 회차 잠금 해제 시 일반 코인이 먼저 사용되며, 부족할 경우 리워드 코인이 자동으로 사용됩니다.
              </div>
              <div className="rules-modal-item">
                6. 코인 및 충전 보너스로 지급된 코인은 유효기간이 없으며, 기타 리워드 코인은 모두 30일의 유효기간이 적용됩니다.
              </div>
              <div className="rules-modal-item">
                7. 모든 미션과 출석은 매일 태평양 표준시 0시에 초기화됩니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
