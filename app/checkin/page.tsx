"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";

async function getAccessToken() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session?.access_token ?? null;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    id: "greeting",
    icon: "✉️",
    title: "일일 문안 인사",
    subtitle: "출석 한마디 남기기 +10 코인",
    coin: 10,
    btnLabel: "인사하기",
    done: false,
  },
  {
    id: "game_training",
    icon: "⚔️",
    title: "일일 무공 수련",
    subtitle: "무공수련 게임 1회 완료 +10 코인",
    coin: 10,
    btnLabel: "수련하기",
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
  const { user, session } = useAuth();
  const [coins, setCoins] = useState(0);

  // ✅ 테마 상태 추가
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {}
  }, []);
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

        const refCode = localStorage.getItem("referral_code");
        const url = refCode ? `/api/me/wallet?ref=${refCode}` : `/api/me/wallet`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setCoins(Number(data.reward_points ?? 0));
          if (refCode) {
            localStorage.removeItem("referral_code");
          }
        }
      } catch (e) { /* ignore */ }
    };
    if (user && session) loadWallet();
  }, [user, session]);

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
          const todayStr = getTodayDateString();
          (data.completedTasks as string[]).forEach((id) => {
            const isDaily = id !== "youtube" && id !== "more" && !id.startsWith("youtube") && !id.startsWith("more");
            if (isDaily) {
              if (id.endsWith("_" + todayStr)) {
                doneMap[id] = true;
              }
            } else {
              doneMap[id] = true;
            }
          });
          setTaskDone(doneMap);

          // 출석 체크 완료 여부 동기화
          if (doneMap["checkin_" + todayStr]) {
            setCheckedIn(true);
          }
        }
      } catch (e) {
        // 네트워크 오류 시 localStorage 폴백
        const savedTasks = localStorage.getItem("checkin_tasks");
        if (savedTasks) setTaskDone(JSON.parse(savedTasks));
      }
    };
    loadCompletedTasks();
  }, [user, session]);

  // 출석체크 연속 일수 (DB에서 로드)
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          // 비로그인 시 기존 localStorage 로직 폴백
          const saved = localStorage.getItem("checkin_data");
          if (saved) {
            const parsed = JSON.parse(saved);
            const todayStr = new Date().toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (parsed.lastDate === todayStr) {
              setStreak(parsed.streak ?? 0);
              setCheckedIn(true);
            } else if (parsed.lastDate === yesterday.toDateString()) {
              setStreak(parsed.streak ?? 0);
            } else {
              setStreak(0);
            }
          }
          return;
        }

        const res = await fetch("/api/me/checkin/streak", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          setStreak(data.streak || 0);
          if (data.checkedInToday) {
            setCheckedIn(true);
          }
        }
      } catch (e) { /* ignore */ }
    };
    loadStreak();
  }, [user, session]);

  const handleCheckin = async () => {
    if (checkedIn) {
      alert("오늘 이미 출석체크를 완료했습니다!");
      return;
    }
    const todayStr = getTodayDateString();
    const newStreak = streak + 1;
    const reward = ATTENDANCE_REWARDS[(newStreak - 1) % 7].coin;

    try {
      const token = await getAccessToken();
      if (token) {
        // 로그인 상태: Supabase API로 저장
        const res = await fetch("/api/me/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: "checkin_" + todayStr, coin: reward }),
        });
        const data = await res.json().catch(() => null);

        if (res.status === 409) {
          alert("오늘 이미 출석체크를 완료했습니다!");
          setCheckedIn(true);
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "서버 오류");
        if (data?.newRewardPoints !== undefined) {
          setCoins(Number(data.newRewardPoints));
        } else {
          setCoins((prev) => prev + reward);
        }
      } else {
        // 비로그인 상태: 로컬에서만 지급
        setCoins((prev) => prev + reward);
      }

      setStreak(newStreak);
      setCheckedIn(true);
      try {
        localStorage.setItem("checkin_data", JSON.stringify({
          lastDate: new Date().toDateString(),
          streak: newStreak,
        }));
      } catch (e) { /* ignore */ }

      // 지갑 잔액 변경 브로드캐스트
      window.dispatchEvent(new Event("wallet-updated"));
      alert(`출석 완료! +${reward} 코인 적립되었습니다 🎉`);
    } catch (e: any) {
      alert(`출석체크 중 오류가 발생했습니다: ${e?.message ?? "잠시 후 다시 시도해주세요."}`);
    }
  };



  const claimShareReward = async () => {
    try {
      const token = await getAccessToken();
      const todayStr = getTodayDateString();

      if (!token) {
        setCoins((prev) => prev + 30);
        setTaskDone((prev) => ({ ...prev, [`share_${todayStr}`]: true }));
        try {
          const savedTasks = localStorage.getItem("checkin_tasks");
          const existing = savedTasks ? JSON.parse(savedTasks) : {};
          existing[`share_${todayStr}`] = true;
          localStorage.setItem("checkin_tasks", JSON.stringify(existing));
        } catch (e) {}
        alert("친구에게 공유하기 완료! +30 코인이 가상 적립되었습니다.");
        return;
      }

      const res = await fetch("/api/me/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: "share", coin: 30, daily: true, dateStr: todayStr }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 409) {
        alert("오늘 이미 공유 미션을 완료했습니다.");
        setTaskDone((prev) => ({ ...prev, share: true }));
        return;
      }
      if (!res.ok) throw new Error(data?.error ?? "서버 오류");
      if (data?.newRewardPoints !== undefined) {
        setCoins(Number(data.newRewardPoints));
      } else {
        setCoins((prev) => prev + 30);
      }
      setTaskDone((prev) => ({ ...prev, share: true }));
      window.dispatchEvent(new Event("wallet-updated"));
      alert("친구에게 공유하기 미션 완료! +30 코인이 적립되었습니다 🎉");
    } catch (e: any) {
      alert(`오류: ${e?.message ?? "잠시 후 다시 시도해주세요."}`);
    }
  };

  const handleTask = (taskId: string, label: string) => {
    const todayStr = getTodayDateString();
    const isDaily = taskId !== "youtube" && taskId !== "more";
    const taskKey = isDaily ? `${taskId}_${todayStr}` : taskId;
    if (taskDone[taskKey]) return;
    if (taskId === "greeting") {
      router.push("/community?category=자유 대담&openWriteModal=1");
      return;
    }
    if (taskId === "game_training") {
      router.push("/?openGameModal=1");
      return;
    }
    if (label === "광고 보기") {
      alert("광고 기능은 준비중입니다.");
      return;
    }
    if (label === "초대하기") {
      const userRefCode = user?.id ? user.id.slice(0, 8) : "";
      const inviteUrl = userRefCode
        ? `${window.location.origin}/login?ref=${userRefCode}`
        : `${window.location.origin}/login`;

      if (navigator.share) {
        navigator.share({
          title: "무림북 추천 초대",
          text: "무림북에 오셔서 출석하고 오디오북 코인 받아 가세요!",
          url: inviteUrl,
        }).catch(() => {
          navigator.clipboard.writeText(inviteUrl);
        });
      } else {
        navigator.clipboard.writeText(inviteUrl)
          .then(() => {
            alert(`친구 초대 링크가 클립보드에 복사되었습니다!\n친구가 이 링크로 가입하면 500코인이 지급됩니다.\n링크: ${inviteUrl}`);
          })
          .catch(() => {
            alert("초대 링크 복사에 실패했습니다.");
          });
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
      const shareUrl = window.location.origin;
      if (navigator.share) {
        navigator.share({
          title: "무림북",
          text: "고품격 오디오 소설 무림북!",
          url: shareUrl,
        })
        .then(() => {
          claimShareReward();
        })
        .catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            alert("공유 링크가 클립보드에 복사되었습니다!");
            claimShareReward();
          })
          .catch(() => {
            alert("공유 링크 복사에 실패했습니다.");
          });
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
      // 지갑 잔액 및 미션 상태 브로드캐스트
      window.dispatchEvent(new Event("wallet-updated"));
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
    const todayStr = getTodayDateString();
    const taskKey = `${taskId}_${todayStr}`;
    if (taskDone[taskKey]) return;
    try {
      const token = await getAccessToken();
      if (token) {
        const res = await fetch("/api/me/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId, coin, daily: true, dateStr: todayStr }),
        });
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          alert("오늘 이미 완료한 미션입니다.");
          setTaskDone((prev) => ({ ...prev, [taskKey]: true }));
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
        try {
          const saved = localStorage.getItem("checkin_tasks");
          const existing = saved ? JSON.parse(saved) : {};
          existing[taskKey] = true;
          localStorage.setItem("checkin_tasks", JSON.stringify(existing));
        } catch (e) {}
      }
      setTaskDone((prev) => ({ ...prev, [taskKey]: true }));
      // 지갑 잔액 및 미션 상태 브로드캐스트
      window.dispatchEvent(new Event("wallet-updated"));
      alert(`+${coin} 코인이 적립되었습니다! 🎉`);
    } catch (e: any) {
      alert(`오류: ${e?.message ?? "잠시 후 다시 시도해주세요."}`);
    }
  };

  const todayIdx = streak % 7;

  return (
    <main className={`ci-root ${theme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Noto+Serif+KR:wght@500;700;900&display=swap');

        * { box-sizing: border-box; }

        .ci-root {
          min-height: 100dvh;
          background: #0d0c10;
          color: #ffffff;
          font-family: 'Outfit', ui-sans-serif, system-ui, "Noto Sans KR", Arial;
        }

        .ci-wrap {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 0 90px;
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
          font-family: 'Noto Serif KR', serif;
          font-size: 17px;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.2px;
        }

        /* ── 코인 히어로 ── */
        .ci-hero {
          position: relative;
          padding: 28px 20px 20px;
          background: linear-gradient(160deg, #1d1222 0%, #0d0c10 60%);
          overflow: hidden;
        }

        .ci-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%);
        }

        .ci-hero-amount {
          font-family: 'Outfit', sans-serif;
          font-size: 44px;
          font-weight: 900;
          color: #f7d070;
          letter-spacing: -2px;
          line-height: 1;
          margin: 0;
          text-shadow: 0 0 10px rgba(247,208,112,0.2);
        }

        .ci-hero-label {
          font-family: 'Noto Serif KR', serif;
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          font-weight: 700;
          margin-top: 4px;
        }

        .ci-hero-coin-img {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffe066 0%, #cc9900 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(204,153,0,0.3);
        }

        .ci-rules-btn {
          position: absolute;
          top: 20px;
          right: 104px;
          background: rgba(255, 255, 255, 0.08);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ci-rules-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: scale(1.05);
        }

        .ci-stars {
          position: absolute;
          top: 16px; left: 50%;
          font-size: 14px;
          opacity: 0.3;
          pointer-events: none;
        }

        /* ── 출석 카드 (연공 서판) ── */
        .ci-attendance-card {
          margin: 16px 16px 0;
          background: #141217;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }

        .ci-streak-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 16px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 16px;
          letter-spacing: -0.4px;
        }

        .ci-streak-highlight {
          color: #ffe066;
          text-shadow: 0 0 8px rgba(255,224,102,0.2);
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
          justify-content: space-between;
          gap: 6px;
          padding: 10px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.05);
          min-width: 46px;
          min-height: 86px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .ci-day-box.today {
          border-color: #ffe066;
          background: rgba(255,224,102,0.06);
          box-shadow: 0 0 12px rgba(255,224,102,0.15) inset;
          animation: goldGlow 2s infinite ease-in-out;
        }

        @keyframes goldGlow {
          0%, 100% { border-color: rgba(255,224,102,0.5); }
          50% { border-color: rgba(255,224,102,1); }
        }

        .ci-day-box.done {
          background: rgba(204,153,0,0.05);
          border-color: rgba(204,153,0,0.25);
        }

        .ci-day-coin-text {
          font-size: 10px;
          font-weight: 800;
          color: #ffe066;
          letter-spacing: -0.3px;
        }

        .ci-day-coin-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffe066 0%, #cc9900 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 3px 8px rgba(204,153,0,0.2);
        }

        /* ── 동양풍 도장 낙인 효과 ── */
        .ci-day-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-12deg);
          width: 32px;
          height: 32px;
          border: 2px dashed #ff4d4d;
          border-radius: 50%;
          color: #ff4d4d;
          font-family: 'Noto Serif KR', serif;
          font-size: 8px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(20,18,23,0.85);
          box-shadow: 0 0 6px rgba(255,77,77,0.3);
          letter-spacing: -1px;
          text-indent: -1px;
        }

        .ci-day-icon-grey {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
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
          color: #ffe066;
          font-weight: 800;
        }

        /* 연공 서판 기록 버튼 */
        .ci-checkin-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #8b152d 0%, #400a16 100%);
          border: 1px solid rgba(255,224,102,0.2);
          border-radius: 14px;
          color: #ffffff;
          font-family: 'Noto Serif KR', serif;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: -0.3px;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(139,21,45,0.4);
        }

        .ci-checkin-btn:active {
          transform: scale(0.98);
          opacity: 0.9;
        }

        .ci-checkin-btn.done {
          background: #252329 !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          box-shadow: none !important;
          color: rgba(255,255,255,0.35) !important;
          cursor: default;
        }

        /* ── 일일 연공록 (출석인사) 섹션 ── */
        .ci-greetings-section {
          margin: 20px 16px 0;
          background: #141217;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }

        .ci-greetings-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 16px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ci-greeting-form {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .ci-greeting-input {
          flex: 1;
          height: 44px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 0 12px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        .ci-greeting-input:focus {
          border-color: #ffe066;
        }

        .ci-greeting-submit {
          height: 44px;
          padding: 0 16px;
          background: linear-gradient(135deg, #bf953f 0%, #aa771c 100%);
          border: none;
          border-radius: 10px;
          color: #141217;
          font-family: 'Noto Serif KR', serif;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .ci-greeting-submit:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .ci-greeting-done-msg {
          background: rgba(255,224,102,0.05);
          border: 1px dashed rgba(255,224,102,0.2);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          font-size: 13px;
          color: #ffe066;
          font-weight: 600;
          margin-bottom: 16px;
        }

        /* 인사말 피드 */
        .ci-greeting-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .ci-greeting-list::-webkit-scrollbar {
          width: 4px;
        }
        .ci-greeting-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }

        .ci-greeting-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ci-greeting-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
        }

        .ci-greeting-user {
          color: #f7d070;
        }

        .ci-greeting-text {
          font-size: 12.5px;
          color: rgba(255,255,255,0.85);
          line-height: 1.4;
          word-break: break-all;
        }

        .ci-greeting-empty {
          text-align: center;
          padding: 24px 0;
          color: rgba(255,255,255,0.3);
          font-size: 12px;
        }

        /* ── 섹션 타이틀 ── */
        .ci-section-title {
          font-family: 'Noto Serif KR', serif;
          font-size: 17px;
          font-weight: 900;
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
          background: #141217;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 14px 16px;
          transition: border-color 0.2s;
        }

        .ci-task-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
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
          color: #ffe066;
          font-weight: 800;
        }

        .ci-task-btn {
          flex-shrink: 0;
          background: linear-gradient(135deg, #ffe066 0%, #cc9900 100%);
          color: #141217;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(204,153,0,0.25);
        }

        .ci-task-btn:active {
          transform: scale(0.95);
        }

        .ci-task-btn.done-btn {
          background: #252329 !important;
          color: rgba(255,255,255,0.3) !important;
          box-shadow: none !important;
          cursor: default;
        }

        .ci-task-btn.listen-btn {
          background: rgba(255,255,255,0.08) !important;
          color: rgba(255,255,255,0.85) !important;
          box-shadow: none !important;
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
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }

        .watch-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b152d 0%, #ffe066 100%);
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
          background: rgba(0,0,0,0.8);
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
          background: #141217;
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
          font-family: 'Noto Serif KR', serif;
          font-size: 18px;
          font-weight: 900;
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
          background: rgba(255,224,102,0.1);
          border: 1px solid rgba(255,224,102,0.3);
          border-radius: 20px;
          padding: 8px 20px;
          font-size: 15px;
          font-weight: 800;
          color: #ffe066;
          letter-spacing: -0.3px;
        }

        .yt-modal-confirm-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #ffe066 0%, #cc9900 100%);
          border: none;
          border-radius: 14px;
          color: #141217;
          font-family: 'Noto Serif KR', serif;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(204,153,0,0.3);
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
          background: rgba(0,0,0,0.8);
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
          background: #141217;
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
          font-family: 'Noto Serif KR', serif;
          font-size: 17px;
          font-weight: 900;
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
          font-size: 13.5px;
          color: rgba(255,255,255,0.65);
          line-height: 1.5;        .ci-root.light .ci-checkin-btn.done {
          background: #e9e3d5 !important;
          border: 1px solid #dcd5c4 !important;
          color: #8e877c !important;
        }

        /* 라이트 모드 연공록 */
        .ci-root.light .ci-greetings-section {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 4px 16px rgba(180, 160, 120, 0.12);
        }
        .ci-root.light .ci-greetings-title {
          color: #2b2724;
        }
        .ci-root.light .ci-greeting-input {
          background: rgba(0,0,0,0.02);
          border: 1px solid #e1dbcd;
          color: #2b2724;
        }
        .ci-root.light .ci-greeting-input:focus {
          border-color: #aa771c;
        }
        .ci-root.light .ci-greeting-submit {
          background: linear-gradient(135deg, #8b152d 0%, #600d1e 100%);
          color: #ffffff;
        }
        .ci-root.light .ci-greeting-done-msg {
          background: rgba(139,21,45,0.04);
          border-color: rgba(139,21,45,0.15);
          color: #8b152d;
        }
        .ci-root.light .ci-greeting-card {
          background: rgba(0,0,0,0.01);
          border: 1px solid #e1dbcd;
        }
        .ci-root.light .ci-greeting-user {
          color: #8b152d;
        }
        .ci-root.light .ci-greeting-text {
          color: #2b2724;
        }
        .ci-root.light .ci-greeting-empty {
          color: #8e877c;
        }
        .ci-root.light .ci-greeting-meta {
          color: #8e877c;
        }

        /* 라이트 모드 미션 리스트 */
        .ci-root.light .ci-section-title {
          color: #2b2724;
        }
        .ci-root.light .ci-task-card {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 2px 8px rgba(180, 160, 120, 0.08);
        }
        .ci-root.light .ci-task-icon-wrap {
          background: rgba(0,0,0,0.03);
        }
        .ci-root.light .ci-task-title {
          color: #2b2724;
        }
        .ci-root.light .ci-task-title-badge {
          color: #8e877c;
        }
        .ci-root.light .ci-task-sub {
          color: #5d564f;
        }
        .ci-root.light .ci-task-sub .coin-highlight {
          color: #8b152d;
        }
        .ci-root.light .ci-task-btn {
          background: linear-gradient(135deg, #8b152d 0%, #600d1e 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(139,21,45,0.25);
        }
        .ci-root.light .ci-task-btn.done-btn {
          background: #e9e3d5 !important;
          border: 1px solid #dcd5c4 !important;
          color: #8e877c !important;
        }
        .ci-root.light .ci-task-btn.listen-btn {
          background: #e9e3d5 !important;
          border: 1px solid #dcd5c4 !important;
          color: #2b2724 !important;
        }
        .ci-root.light .watch-bar-track {
          background: rgba(0,0,0,0.06);
        }
        .ci-root.light .watch-timer-text {
          color: #5d564f;
        }
        .ci-root.light .yt-modal-sheet {
          background: #fdfbf7;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
        }
        .ci-root.light .yt-modal-title {
          color: #2b2724;
        }
        .ci-root.light .yt-modal-desc {
          color: #5d564f;
        }
        .ci-root.light .yt-modal-cancel-btn {
          color: #8e877c;
        }
        .ci-root.light .rules-modal-box {
          background: #fdfbf7;
          border: 1px solid #e1dbcd;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .ci-root.light .rules-modal-title {
          color: #2b2724;
        }
        .ci-root.light .rules-modal-close {
          color: #8e877c;
        }
        .ci-root.light .rules-modal-item {
          color: #5d564f;
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
          <h1 className="ci-page-title">출석 보상</h1>
        </div>

        {/* 코인 히어로 */}
        <div className="ci-hero">
          <p className="ci-hero-amount">{coins.toLocaleString()}</p>
          <p className="ci-hero-label">출석 보상 (리워드 코인)</p>
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
                    <div className="ci-day-stamp">出席</div>
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
            {checkedIn ? "오늘 출석 완료 ✓" : "출석체크하기"}
          </button>
        </div>

        {/* 코인 미션 섹션 */}
        <p className="ci-section-title">코인 미션</p>
        <div className="ci-task-list">
          {EARN_TASKS
            .filter((task) => !(task.id === "youtube" && taskDone["youtube"]))
            .map((task) => {
              const todayStr = getTodayDateString();
              const isDaily = task.id !== "youtube" && task.id !== "more";
              const taskKey = isDaily ? `${task.id}_${todayStr}` : task.id;
              const isDone = task.done || !!taskDone[taskKey];
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
      <BottomNav />
    </main>
  );
}
