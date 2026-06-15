"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import WorkPosterCard from "@/app/components/work/WorkPosterCard";
import BottomNav from "@/app/components/BottomNav";
import MugongGameLauncher from "@/app/components/game/MugongGameLauncher";

import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type LastPlayed = {
  workId: string;
  episodeId: string;
  part: number;
  updatedAt?: number;
};

// SVG 아이콘 컴포넌트
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function MembershipIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
      <defs>
        <linearGradient id="vipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2a5f" />
          <stop offset="100%" stopColor="#ff7f00" />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="url(#vipGrad)" />
      <path d="M7 10h4M7 13h2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="12" r="2" fill="#ffffff" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
      <circle cx="12" cy="12" r="10" fill="#fca834" />
      <circle cx="12" cy="12" r="7" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      <text x="12" y="15.5" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">P</text>
    </svg>
  );
}


function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function CheckIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, loading } = useAuth();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loginHover, setLoginHover] = useState(false);

  // ✅ 검색어 및 탭 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("추천");

  // ✅ 남은 미션 개수 상태
  const [remainingMissions, setRemainingMissions] = useState<number | null>(null);

  // 무공 수련 관련 상태
  const [activeLauncherGame, setActiveLauncherGame] = useState<null | "breath" | "pulse" | "puzzle" | "dodge">(null);
  const [selectedLeaderboardGame, setSelectedLeaderboardGame] = useState<"breath" | "pulse" | "puzzle" | "dodge">("breath");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"weekly" | "allTime">("weekly");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [weeklyRankings, setWeeklyRankings] = useState<any[]>([]);
  const [allTimeRankings, setAllTimeRankings] = useState<any[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // 리더보드 로드
  const loadLeaderboard = async (gameId: string) => {
    try {
      setLoadingLeaderboard(true);
      const res = await fetch(`/api/game/leaderboard?gameId=${gameId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setWeeklyRankings(data.weeklyRankings ?? []);
        setAllTimeRankings(data.allTimeRankings ?? []);
        setParticipantsCount(data.participantsCount ?? 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === "무공 수련") {
      loadLeaderboard(selectedLeaderboardGame);
    }
  }, [activeTab, selectedLeaderboardGame]);

  // 게임 완료 시 점수 제출 및 정산
  const handleGameFinished = async (score: number) => {
    if (!activeLauncherGame) return;
    const gameId = activeLauncherGame;
    setActiveLauncherGame(null);

    if (score <= 0) {
      alert("수련 점수가 0점이라 기록이 등록되지 않았습니다. 더 연마하세요!");
      return;
    }

    try {
      const token = session?.access_token;
      if (!token) {
        alert(`수련이 끝났습니다! 최종 점수: ${score.toLocaleString()} (로그인을 하시면 점수가 랭킹에 기록되고 미션 코인을 받을 수 있습니다.)`);
        return;
      }

      const res = await fetch("/api/game/score", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ gameId, score })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "기록 등록 실패");

      if (data?.earnedMissionReward) {
        alert(`✨ 수련 성공! ✨\n\n최종 점수: ${score.toLocaleString()}\n점수가 랭킹에 등록되었습니다.\n\n🎁 일일 무공 수련 미션 완료 보상 +10 코인 지급 완료!`);
        // 코인 및 미션 개수 동기화
        window.dispatchEvent(new Event("wallet-updated"));
      } else {
        alert(`✨ 수련 성공! ✨\n\n최종 점수: ${score.toLocaleString()}\n점수가 랭킹에 등록되었습니다.`);
      }

      // 리더보드 갱신
      loadLeaderboard(selectedLeaderboardGame);
    } catch (err: any) {
      alert(`오류: ${err.message ?? "점수 등록 중 오류가 발생했습니다."}`);
    }
  };

  // 수련하기 숏컷 쿼리 파라미터 처리
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openGameModal") === "1") {
        setActiveTab("무공 수련");
        router.replace("/");
      }
    }
  }, [router]);

  // ✅ 남은 미션 개수 불러오기
  const loadRemainingMissions = async () => {
    try {
      const token = session?.access_token;
      if (!token) {
        setRemainingMissions(null);
        return;
      }

      const res = await fetch("/api/me/tasks", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.completedTasks) {
        const completed: string[] = data.completedTasks;
        
        // 오늘 날짜 포맷
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        // 대상 미션들
        const missions = [
          "checkin_" + todayStr,
          "greeting_" + todayStr,
          "youtube",
          "invite_" + todayStr,
          "watch5_" + todayStr,
          "watch10_" + todayStr,
          "watch15_" + todayStr,
          "share_" + todayStr
        ];

        const incompleteCount = missions.filter((m) => !completed.includes(m)).length;
        setRemainingMissions(incompleteCount);
      } else {
        setRemainingMissions(null);
      }
    } catch (e) {
      console.error("미션 개수 로드 에러:", e);
      setRemainingMissions(null);
    }
  };

  // ✅ 미션 개수 갱신 이벤트 리스너 및 초기 호출
  useEffect(() => {
    if (user && session) {
      loadRemainingMissions();

      const handleFocus = () => {
        loadRemainingMissions();
      };
      window.addEventListener("focus", handleFocus);
      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    } else {
      setRemainingMissions(null);
    }
  }, [user, session]);

  useEffect(() => {
    const handleWalletUpdate = () => {
      if (user && session) {
        loadRemainingMissions();
      }
    };
    window.addEventListener("wallet-updated", handleWalletUpdate);
    return () => {
      window.removeEventListener("wallet-updated", handleWalletUpdate);
    };
  }, [user, session]);

  // ✅ 이어듣기 정보
  const [lastPlayed, setLastPlayed] = useState<LastPlayed | null>(null);

  // ✅ DB에서 소설 목록 불러오기
  const [worksList, setWorksList] = useState<any[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setLoadingWorks(true);
        const { data, error } = await supabase
          .from("works")
          .select(`
            *,
            episodes (
              id,
              release_date
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching works:", error);
        } else if (data) {
          const mapped = data.map((w: any) => {
            const isOldNew = w.badge === "신작" && w.created_at && (new Date().getTime() - new Date(w.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
            
            // Find the first published episode ID
            const publishedEpisodes = (w.episodes || [])
              .filter((e: any) => new Date(e.release_date).getTime() <= Date.now())
              .sort((a: any, b: any) => {
                const aNum = parseFloat(a.id);
                const bNum = parseFloat(b.id);
                if (isNaN(aNum) || isNaN(bNum)) {
                  return String(a.id).localeCompare(String(b.id));
                }
                return aNum - bNum;
              });
            const firstEpisodeId = publishedEpisodes[0]?.id || null;

            // Determine if the work itself is published/active dynamically
            const isPublished = publishedEpisodes.length > 0 || (w.status !== "준비중" && (w.episodes || []).length === 0);

            // Determine scheduled release date for upcoming section
            let scheduledReleaseDate = null;
            const futureEpisodes = (w.episodes || []).filter((e: any) => new Date(e.release_date).getTime() > Date.now());
            if (futureEpisodes.length > 0) {
              const dates = futureEpisodes.map((e: any) => new Date(e.release_date).getTime());
              scheduledReleaseDate = new Date(Math.min(...dates));
            } else if (w.created_at) {
              scheduledReleaseDate = new Date(w.created_at);
            } else {
              scheduledReleaseDate = new Date();
            }

            return {
              id: w.id,
              title: w.title,
              description: w.description,
              thumbnail: w.thumbnail,
              episodeCount: w.episode_count,
              totalEpisodes: w.total_episodes,
              freeEpisodes: w.free_episodes,
              status: w.status,
              subtitle: w.subtitle,
              badge: isOldNew ? "" : w.badge,
              views: String(w.views),
              exclusive: w.exclusive,
              featured: w.featured,
              is_membership_only: w.is_membership_only,
              firstEpisodeId,
              created_at: w.created_at,
              isPublished,
              scheduledReleaseDate
            };
          });
          setWorksList(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch works from DB:", err);
      } finally {
        setLoadingWorks(false);
      }
    };
    fetchWorks();
  }, []);

  // ✅ 알림 설정 로컬스토리지 연동
  const [alarmSettings, setAlarmSettings] = useState<Record<string, boolean>>({});
  const [shouldPulse, setShouldPulse] = useState(false);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("alarmSettings");
      if (saved) {
        setAlarmSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // DB의 유니크 재생 횟수 불러오기
  useEffect(() => {
    const fetchPlayCounts = async () => {
      try {
        const res = await fetch("/api/media/play-counts");
        if (res.ok) {
          const data = await res.json();
          if (data?.counts) {
            setPlayCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load play counts:", err);
      }
    };
    fetchPlayCounts();

    // 페이지 포커스 시점(뒤로가기 등)에 최신 카운트 갱신
    window.addEventListener("focus", fetchPlayCounts);
    return () => {
      window.removeEventListener("focus", fetchPlayCounts);
    };
  }, []);

  // highlightComingSoon 쿼리 파라미터 처리 (스크롤 및 하이라이트)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("highlightComingSoon") === "true") {
        // 부드럽게 스크롤 이동
        const timerScroll = setTimeout(() => {
          const element = document.getElementById("coming-soon-section");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 500);

        setShouldPulse(true);
        const timerPulse = setTimeout(() => {
          setShouldPulse(false);
        }, 5000);

        return () => {
          clearTimeout(timerScroll);
          clearTimeout(timerPulse);
        };
      }
    }
  }, []);

  // 알림 권한 및 로컬스토리지 토글 함수
  const handleRequestNotification = async (workId: string) => {
    const isSet = alarmSettings[workId];
    if (isSet) {
      const updated = { ...alarmSettings, [workId]: false };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 해제되었습니다.");
      return;
    }

    if (!("Notification" in window)) {
      const updated = { ...alarmSettings, [workId]: true };
      setAlarmSettings(updated);
      localStorage.setItem("alarmSettings", JSON.stringify(updated));
      alert("알림 설정이 완료되었습니다! (알림을 지원하지 않는 브라우저이므로 설정만 완료되었습니다)");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...alarmSettings, [workId]: true };
        setAlarmSettings(updated);
        localStorage.setItem("alarmSettings", JSON.stringify(updated));
        alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
      } else {
        alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
      }
    } catch (error) {
      Notification.requestPermission((permission) => {
        if (permission === "granted") {
          const updated = { ...alarmSettings, [workId]: true };
          setAlarmSettings(updated);
          localStorage.setItem("alarmSettings", JSON.stringify(updated));
          alert("알림이 정상적으로 허용 및 설정되었습니다! 작품이 공개되면 알림을 보내드리겠습니다.");
        } else {
          alert("알림 권한이 거부되었습니다. 기기 설정에서 알림 권한을 허용해 주셔야 알림을 받으실 수 있습니다.");
        }
      });
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastPlayed");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed?.workId || !parsed?.episodeId || !parsed?.part) return;

      setLastPlayed({
        workId: String(parsed.workId),
        episodeId: String(parsed.episodeId),
        part: Number(parsed.part),
        updatedAt: parsed.updatedAt ? Number(parsed.updatedAt) : undefined,
      });
    } catch {
      // 무시
    }
  }, []);

  // ✅ 이어듣기 링크
  const continueHref = useMemo(() => {
    if (!lastPlayed) return "";
    return `/episode/${lastPlayed.workId}/${lastPlayed.episodeId}?part=${lastPlayed.part}&autoplay=1`;
  }, [lastPlayed]);
  const lastPlayedWorkTitle = useMemo(() => {
    if (!lastPlayed?.workId) return "";
    return worksList.find((work) => work.id === lastPlayed.workId)?.title ?? lastPlayed.workId;
  }, [lastPlayed, worksList]);

  // ✅ 검색 및 탭 필터링/정렬 로직
  const filteredWorks = useMemo(() => {
    // 실시간 DB 재생 횟수를 정적 데이터와 병합
    let result = worksList.map((w) => ({
      ...w,
      views: String(playCounts[w.id] ?? w.views ?? "0")
    }));

    // 1. 검색어 필터링
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          (w.subtitle && w.subtitle.toLowerCase().includes(q))
      );
    }

    // 2. 카테고리 탭 필터링 및 정렬
    if (activeTab === "신작") {
      result = result.filter((w) => w.badge === "신작" && w.is_membership_only !== true);
    } else if (activeTab === "멤버십전용") {
      result = result.filter((w) => w.is_membership_only === true);
    } else if (activeTab === "인기 순위") {
      result = result.filter((w) => w.is_membership_only !== true);
      const parseViews = (viewsStr?: string) => {
        if (!viewsStr) return 0;
        const s = viewsStr.toUpperCase();
        if (s.endsWith("M")) return parseFloat(s) * 1000000;
        if (s.endsWith("K")) return parseFloat(s) * 1000;
        return parseFloat(s) || 0;
      };
      // 조회수 내림차순 정렬
      result = [...result].sort((a, b) => parseViews(b.views) - parseViews(a.views));
    } else {
      // 기본/추천 등 기타 탭
      result = result.filter((w) => w.is_membership_only !== true);
    }

    return result;
  }, [searchQuery, activeTab, playCounts, worksList]);

  // 메인 그리드용 작품 (공개된 작품만)
  const mainGridWorks = useMemo(() => {
    return filteredWorks.filter((w) => w.isPublished);
  }, [filteredWorks]);

  // 공개 예정 섹션용 작품 (공개 예정이며 미래 예약된 작품만)
  const comingSoonWorks = useMemo(() => {
    return worksList
      .filter((w) => !w.isPublished)
      .map((w) => ({
        ...w,
        views: String(playCounts[w.id] ?? w.views ?? "0")
      }));
  }, [playCounts, worksList]);

  return (
    <main
      className="main-container"
      style={{
        minHeight: "100dvh",
        background: "#000000",
        color: "white",
        padding: "16px 16px 80px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial',
      }}
    >
      {/* 스타일정의 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Noto+Serif+KR:wght@500;700;900&display=swap');

        @keyframes lightSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        .desktop-topbar {
          width: 100%;
        }

        /* 모바일에서 기본 탑바 숨김 */
        @media (max-width: 768px) {
          .desktop-topbar {
            display: none !important;
          }
          .intro-banner {
            display: none !important;
          }
        }

        /* 데스크탑에서 모바일 구성요소 숨김/정렬 */
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
          .search-header-container {
            justify-content: flex-end;
            margin-top: 10px;
          }
          .search-input-wrapper {
            max-width: 320px;
          }
        }

        /* 공통 헤더 스타일 */
        .search-header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1c1c24;
          border-radius: 999px;
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .search-input {
          background: transparent;
          border: none;
          color: white;
          font-size: 14px;
          outline: none;
          width: 100%;
        }

        .search-input::placeholder {
          color: #5b5b66;
        }

        .header-icons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.2s;
        }

        .icon-btn:active {
          transform: scale(0.9);
        }

        .gift-badge {
          position: absolute;
          top: -4px;
          right: -6px;
          background: #ff2a5f;
          color: white;
          font-size: 8px;
          font-weight: 900;
          border-radius: 8px;
          padding: 1px 4px;
          border: 1px solid #000000;
          letter-spacing: -0.3px;
        }

        /* 카테고리 탭 */
        .category-tabs {
          display: flex;
          gap: 22px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-tab {
          padding: 10px 0 12px;
          font-size: 17px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          position: relative;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .category-tab.active {
          color: #ffffff;
          font-weight: 850;
        }

        .category-tab.active::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #ffffff;
          border-radius: 99px;
        }

        /* 이어듣기 카드 */
        .continue-play-card {
          width: 100%;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 215, 120, 0.2);
          background: linear-gradient(135deg, rgba(255, 241, 168, 0.08) 0%, rgba(243, 201, 105, 0.04) 50%, rgba(212, 162, 60, 0.03) 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .continue-play-title {
          font-size: 13px;
          font-weight: 700;
          color: #ffe9a3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .continue-play-title .play-icon {
          margin-right: 4px;
          font-size: 11px;
        }

        .continue-play-btn {
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 12px;
          color: #2b1d00;
          background: linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%);
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(255, 215, 120, 0.25);
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .continue-play-btn:hover {
          opacity: 0.95;
        }

        /* 그리드 */
        .works-poster-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px 10px;
          align-items: start;
        }

        @media (min-width: 600px) {
          .works-poster-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (min-width: 1024px) {
          .works-poster-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 20px;
          }
        }


        /* 포스터 카드 스타일 (WorkPosterCard) */
        .poster-card {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
          width: 100%;
        }

        .poster-card:hover {
          transform: translateY(-4px);
        }

        .poster-card:active {
          transform: translateY(-1px);
        }

        .poster-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .poster-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .poster-card:hover .poster-img {
          transform: scale(1.04);
        }

        .poster-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          z-index: 2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
          letter-spacing: -0.3px;
        }


        .coming-soon-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(1px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
        }

        .coming-soon-text {
          background: rgba(255, 215, 120, 0.15);
          color: #ffe9a3;
          border: 1px solid rgba(255, 215, 120, 0.4);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.3px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .views-overlay {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(0, 0, 0, 0.55);
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 3px;
          z-index: 2;
          letter-spacing: -0.2px;
        }

        .poster-info {
          margin-top: 8px;
          padding: 0 2px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          height: 60px;
          overflow: hidden;
        }

        .poster-title {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
          color: #ffffff;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          height: 35px; /* 2줄 확보용 고정 높이 */
          word-break: keep-all;
        }

        .poster-subtitle {
          font-size: 11px;
          font-weight: 500;
          color: #8c8c96;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 공개 예정 섹션 */
        .coming-soon-section {
          margin-top: 32px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 16px 0;
          letter-spacing: -0.3px;
        }

        .coming-soon-date-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .coming-soon-date {
          font-size: 13px;
          font-weight: 700;
          color: #8c8c96;
        }

        .coming-soon-divider {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .coming-soon-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px 10px;
        }

        @media (min-width: 600px) {
          .coming-soon-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
        }

        .coming-soon-item-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .alarm-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          height: 32px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
        }

        .alarm-btn:active {
          transform: scale(0.96);
        }

        .alarm-btn.active {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        /* 펄스 애니메이션 (알림받기 활성화 강조용) */
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 42, 95, 0.6);
            border-color: rgba(255, 42, 95, 0.8);
            background: rgba(255, 42, 95, 0.25);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 42, 95, 0);
            border-color: rgba(255, 42, 95, 0.8);
            background: rgba(255, 42, 95, 0.35);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 42, 95, 0);
            border-color: rgba(255, 255, 255, 0.05);
            background: rgba(255, 255, 255, 0.12);
          }
        }

        .alarm-btn.pulse {
          animation: pulseGlow 1.5s infinite;
        }
      `}</style>

      {/* 데스크탑 전용 탑바 */}
      <div className="desktop-topbar">
        <TopBar />
      </div>

      {/* 검색 헤더 (모바일 전용 crown/gift 포함) */}
      <div className="search-header-container">
        <div className="search-input-wrapper">
          <SearchIcon />
          <input
            type="text"
            placeholder="작품명, 태그 검색..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-icons">
          <button className="icon-btn" onClick={() => router.push("/membership")} title="멤버십 가입">
            <MembershipIcon />
          </button>
          <button className="icon-btn" onClick={() => router.push("/checkin")} title="출석체크 / 무료코인 받기">
            <CoinIcon />
            {remainingMissions !== null && remainingMissions > 0 && (
              <div className="gift-badge">+{remainingMissions}</div>
            )}
          </button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="category-tabs">
        {["추천", "신작", "인기 순위", "멤버십전용", "무공 수련"].map((tab) => (
          <div
            key={tab}
            className={`category-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {activeTab !== "무공 수련" ? (
        <>
          {/* ✅ 이어듣기 카드 */}
          {lastPlayed && (
            <div className="continue-play-card">
              <div className="continue-play-title">
                <span className="play-icon">▶</span> {lastPlayedWorkTitle} · {lastPlayed.episodeId}화 · {lastPlayed.part}편부터
              </div>
              <Link
                href={
                  user
                    ? continueHref
                    : `/login?redirect=${encodeURIComponent(continueHref)}`
                }
                style={{ textDecoration: "none" }}
                onClick={() => {
                  try {
                    sessionStorage.setItem("episodeBackPath", "/");
                  } catch (e) {}
                }}
              >
                <div className="continue-play-btn">
                  이어서 듣기
                </div>
              </Link>
            </div>
          )}

          {/* ✅ 소개 박스 (데스크탑 전용) */}
          <div
            className="intro-banner"
            style={{
              maxWidth: 900,
              margin: "0 auto 28px",
              padding: "31px 17px",
              borderRadius: 28,
              background:
                "linear-gradient(135deg, rgba(7,10,22,0.58) 0%, rgba(8,11,24,0.46) 45%, rgba(10,13,26,0.34) 100%)",
              border: "1px solid rgba(255,215,120,0.22)",
              boxShadow:
                "0 0 14px rgba(255,215,120,0.18), 0 12px 40px rgba(0,0,0,0.024)",
              backdropFilter: "blur(0px)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.2,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              검과 강호의 이야기를 귀로 감상
            </div>
            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.78)",
                margin: 0,
              }}
            >
              무림북은 창작 무협 소설과 오디오 스토리를 중심으로, 에피소드별 음성과 자막을 함께 제공하는 감상형 플랫폼입니다. 강호의 서사를 보다 깊고 편안하게 즐길 수 있도록 구성했습니다.
            </p>
          </div>

          {/* 작품 카드 그리드 */}
          {mainGridWorks.length > 0 ? (
            <div className="works-poster-grid">
              {mainGridWorks.map((work) => (
                <WorkPosterCard key={work.id} work={work} />
              ))}
            </div>
          ) : (
            <div style={{ padding: "80px 20px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: 15 }}>
              검색 결과에 맞는 작품이 없습니다.
            </div>
          )}

          {/* 공개 예정 섹션 */}
          {activeTab === "추천" && !searchQuery && (
            <div className="coming-soon-section" id="coming-soon-section">
              <h2 className="section-title">공개 예정</h2>

              {comingSoonWorks.length > 0 ? (() => {
                // scheduledReleaseDate 기준 날짜 그룹핑
                const groups: { dateLabel: string; time: number; works: typeof comingSoonWorks }[] = [];
                comingSoonWorks.forEach((work) => {
                  let dateLabel = "";
                  let time = 0;
                  if (work.scheduledReleaseDate) {
                    const d = new Date(work.scheduledReleaseDate);
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    dateLabel = `${mm}. ${dd}.`;
                    time = d.getTime();
                  }
                  const existing = groups.find((g) => g.dateLabel === dateLabel);
                  if (existing) {
                    existing.works.push(work);
                  } else {
                    groups.push({ dateLabel, time, works: [work] });
                  }
                });
                
                // 시간 오름차순 정렬
                groups.sort((a, b) => a.time - b.time);
                return (
                  <>
                    {groups.map((group) => (
                      <div key={group.dateLabel}>
                        {group.dateLabel && (
                          <div className="coming-soon-date-header">
                            <span className="coming-soon-date">{group.dateLabel}</span>
                            <div className="coming-soon-divider" />
                          </div>
                        )}
                        <div className="coming-soon-grid">
                          {group.works.map((work) => (
                            <div key={work.id} className="coming-soon-item-container">
                              <WorkPosterCard work={work} />
                              <button
                                className={`alarm-btn ${alarmSettings[work.id] ? "active" : ""} ${shouldPulse ? "pulse" : ""}`}
                                onClick={() => handleRequestNotification(work.id)}
                              >
                                {alarmSettings[work.id] ? (
                                  <>
                                    <CheckIconSmall />
                                    <span>알림 설정 완료</span>
                                  </>
                                ) : (
                                  <>
                                    <ClockIcon />
                                    <span>알림 받기</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })() : (
                <div style={{ padding: "30px 10px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "14px" }}>
                  새로운 작품을 준비 중입니다.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="game-tab-content" style={{ textAlign: "left", marginTop: 8 }}>
          <style>{`
            .game-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 14px;
              margin-bottom: 24px;
            }
            .game-card {
              background: #141217;
              border: 1.5px solid rgba(255, 215, 0, 0.15);
              border-radius: 18px;
              padding: 16px;
              display: flex;
              align-items: center;
              gap: 16px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .game-card:hover {
              border-color: #ffd700;
              box-shadow: 0 4px 20px rgba(255,215,0,0.1);
              transform: translateY(-2px);
            }
            .game-card:active {
              transform: translateY(0);
            }
            .game-icon-box {
              width: 54px;
              height: 54px;
              border-radius: 14px;
              background: rgba(255, 215, 0, 0.08);
              border: 1px solid rgba(255, 215, 0, 0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26px;
              color: #ffd700;
              flex-shrink: 0;
            }
            .game-info {
              flex: 1;
            }
            .game-title-text {
              font-size: 15px;
              font-weight: 850;
              color: #ffffff;
              margin-bottom: 3px;
            }
            .game-desc-text {
              font-size: 11px;
              color: #8c8c96;
              line-height: 1.45;
              margin-bottom: 6px;
            }
            .game-badge-text {
              display: inline-block;
              padding: 2px 6px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 4px;
              font-size: 10px;
              color: #d1d1d6;
              font-weight: 700;
            }
            .training-dashboard-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
              margin-top: 10px;
              width: 100%;
            }
            .leaderboard-container {
              background: #141217;
              border: 1px solid rgba(255,255,255,0.06);
              border-radius: 20px;
              padding: 18px;
            }
            .training-guide-container {
              background: rgba(20, 18, 23, 0.45);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border: 1.5px solid rgba(255, 215, 0, 0.2);
              border-radius: 20px;
              padding: 20px 18px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35),
                          inset 0 0 40px rgba(255, 215, 0, 0.02);
              text-align: left;
              transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .training-guide-container:hover {
              border-color: rgba(255, 215, 0, 0.45);
              transform: translateY(-2px);
              box-shadow: 0 12px 36px 0 rgba(255, 215, 0, 0.08),
                          inset 0 0 40px rgba(255, 215, 0, 0.04);
            }
            .training-guide-container::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(
                45deg,
                transparent 45%,
                rgba(255, 215, 0, 0.12) 50%,
                transparent 55%
              );
              transform: rotate(-45deg);
              pointer-events: none;
              animation: glass-shine 6s infinite ease-in-out;
            }
            @keyframes glass-shine {
              0% { transform: translate(-30%, -30%) rotate(-45deg); opacity: 0; }
              15% { opacity: 1; }
              35% { transform: translate(30%, 30%) rotate(-45deg); opacity: 0; }
              100% { transform: translate(30%, 30%) rotate(-45deg); opacity: 0; }
            }
            .guide-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 16px;
              border-bottom: 1px solid rgba(255, 215, 0, 0.15);
              padding-bottom: 8px;
            }
            .guide-icon {
              font-size: 20px;
            }
            .guide-title {
              font-family: 'Noto Serif KR', serif;
              font-size: 17px;
              font-weight: 950;
              color: #ffd700;
              margin: 0;
              text-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
            }
            .guide-body {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .guide-section {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .guide-section-title {
              font-size: 13.5px;
              font-weight: 850;
              color: #ffffff;
            }
            .guide-section-desc {
              font-size: 11.5px;
              color: #a1a1aa;
              line-height: 1.5;
            }
            .guide-sub-rules {
              background: rgba(0, 0, 0, 0.35);
              border-radius: 8px;
              padding: 8px 10px;
              margin-top: 6px;
              display: flex;
              flex-direction: column;
              gap: 4px;
              border: 1px solid rgba(255, 215, 0, 0.08);
            }
            .leaderboard-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 14px;
              flex-wrap: wrap;
              gap: 8px;
            }
            .leaderboard-title {
              font-family: 'Noto Serif KR', serif;
              font-size: 18px;
              font-weight: 900;
              color: #ffd700;
              margin: 0;
            }
            .leaderboard-prizes {
              background: rgba(0,0,0,0.45);
              padding: 12px 14px;
              border-radius: 12px;
              border: 1px solid rgba(255,215,0,0.25);
              margin-bottom: 14px;
              font-size: 12px;
              line-height: 1.5;
            }
            .leaderboard-cat-tabs {
              display: flex;
              gap: 8px;
              margin-bottom: 12px;
            }
            .leaderboard-cat-tab {
              flex: 1;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
              color: #8c8c96;
              font-size: 12px;
              font-weight: 700;
              padding: 6px 0;
              cursor: pointer;
              text-align: center;
            }
            .leaderboard-cat-tab.active {
              background: rgba(255,215,0,0.12);
              border-color: #ffd700;
              color: #ffd700;
            }
            .period-tabs {
              display: flex;
              gap: 6px;
            }
            .period-tab {
              background: rgba(255, 255, 255, 0.06);
              border: none;
              border-radius: 6px;
              color: #8c8c96;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 10px;
              cursor: pointer;
            }
            .period-tab.active {
              background: #ffffff;
              color: #0b0b12;
            }
            .rank-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 6px;
              border-bottom: 1px solid rgba(255,255,255,0.03);
              font-size: 13px;
            }
            .rank-user {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .rank-num {
              font-weight: 900;
              font-size: 14px;
              width: 20px;
              color: #ffd700;
            }
            .rank-username {
              font-weight: 700;
              color: #ffffff;
            }
            .rank-score {
              font-family: 'Outfit', sans-serif;
              font-weight: 800;
              color: #ffd36a;
            }
            .game-welcome-banner {
              background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(20, 18, 23, 0.6) 100%);
              border: 1px dashed rgba(255, 215, 0, 0.35);
              border-radius: 16px;
              padding: 16px 20px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              position: relative;
              overflow: hidden;
            }
            .game-welcome-banner::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              width: 4px;
              height: 100%;
              background: #ffd700;
            }
            .banner-content {
              flex: 1;
            }
            .banner-badge {
              display: inline-block;
              background: #ff9f0a;
              color: #000000;
              font-size: 10px;
              font-weight: 900;
              padding: 2px 6px;
              border-radius: 4px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .banner-title {
              font-family: 'Noto Serif KR', serif;
              font-size: 16px;
              font-weight: 900;
              color: #ffffff;
              margin: 0 0 6px 0;
            }
            .banner-desc {
              font-size: 12px;
              color: #a1a1aa;
              line-height: 1.5;
              margin: 0;
            }
            .banner-desc strong {
              color: #ffd700;
            }
            .banner-accent-icon {
              font-size: 36px;
              filter: drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3));
              user-select: none;
              animation: float-coin 3s infinite ease-in-out;
            }
            @keyframes float-coin {
              0% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
              100% { transform: translateY(0); }
            }
            .banner-content {
              flex: 1;
            }
            .banner-badge {
              display: inline-block;
              background: #ff9f0a;
              color: #000000;
              font-size: 10px;
              font-weight: 900;
              padding: 2px 6px;
              border-radius: 4px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .banner-title {
              font-family: 'Noto Serif KR', serif;
              font-size: 16px;
              font-weight: 900;
              color: #ffffff;
              margin: 0 0 6px 0;
            }
            .banner-desc {
              font-size: 12px;
              color: #a1a1aa;
              line-height: 1.5;
              margin: 0;
            }
            .banner-desc strong {
              color: #ffd700;
            }
            .guide-details-btn {
              background: rgba(255, 215, 0, 0.1);
              border: 1px solid rgba(255, 215, 0, 0.4);
              color: #ffd700;
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            }
            .guide-details-btn:hover {
              background: rgba(255, 215, 0, 0.2);
              border-color: #ffd700;
              transform: scale(1.03);
            }
            .guide-details-btn:active {
              transform: scale(0.97);
            }
          `}</style>

          {/* 미니게임 안내 배너 */}
          <div className="game-welcome-banner">
            <div className="banner-content">
              <span className="banner-badge">코인 획득</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap" }}>
                <h4 className="banner-title" style={{ margin: 0 }}>🎮 강호 무공 수련관 (미니게임)</h4>
                <button 
                  className="guide-details-btn"
                  onClick={() => setShowGuideModal(true)}
                >
                  자세히 📖
                </button>
              </div>
              <p className="banner-desc" style={{ marginTop: "6px" }}>
                4가지 무공 수련 미니게임을 플레이하고 기록을 등록하세요!<br />
                매일 첫 수련 완료 시 <strong>+10 코인</strong> 즉시 지급 & 주간 랭킹 Top 3 진입 시 <strong>최대 500 코인</strong> 상금이 지급됩니다.
              </p>
            </div>
            <div className="banner-accent-icon">🪙</div>
          </div>

          {/* Mini-game List */}
          <div className="game-grid">
            <div className="game-card" onClick={() => {
              if (!user) { alert("로그인이 필요합니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
              setActiveLauncherGame("breath");
            }}>
              <div className="game-icon-box">🌬️</div>
              <div className="game-info">
                <div className="game-title-text">호흡 수련 (조식조양)</div>
                <div className="game-desc-text">기운을 조화롭게 다스려 적의 예리한 암습을 무력화하십시오.</div>
                <div className="game-badge-text">콤보 방어전</div>
              </div>
            </div>

            <div className="game-card" onClick={() => {
              if (!user) { alert("로그인이 필요합니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
              setActiveLauncherGame("pulse");
            }}>
              <div className="game-icon-box">☯️</div>
              <div className="game-info">
                <div className="game-title-text">기운 응축 (단전응축)</div>
                <div className="game-desc-text">단전에 순수한 진기를 모으고 극의 상태로 정밀 압축하십시오.</div>
                <div className="game-badge-text">타이밍 미니게임</div>
              </div>
            </div>

            <div className="game-card" onClick={() => {
              if (!user) { alert("로그인이 필요합니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
              setActiveLauncherGame("puzzle");
            }}>
              <div className="game-icon-box">🧩</div>
              <div className="game-info">
                <div className="game-title-text">내공 정렬 (단전정렬)</div>
                <div className="game-desc-text">단전의 흐트러진 내공 기맥을 한 줄로 정렬해 진기를 일깨우십시오.</div>
                <div className="game-badge-text">내공 매치 3 퍼즐</div>
              </div>
            </div>

            <div className="game-card" onClick={() => {
              if (!user) { alert("로그인이 필요합니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
              setActiveLauncherGame("dodge");
            }}>
              <div className="game-icon-box">👟</div>
              <div className="game-info">
                <div className="game-title-text">보법 수련 (梅화樁)</div>
                <div className="game-desc-text">매화장 위에서 몸을 놀려 신비로운 신법보법을 연마하십시오.</div>
                <div className="game-badge-text">신법 회피 게임</div>
              </div>
            </div>
          </div>

          {/* Dashboard Layout wrapper for Leaderboard and Guide side-by-side */}
          <div className="training-dashboard-layout">
            {/* Leaderboard Section */}
            <div className="leaderboard-container">
              <div className="leaderboard-header">
                <h3 className="leaderboard-title">무공 랭킹 리더보드</h3>
                <div className="period-tabs">
                  <button
                    className={`period-tab ${leaderboardPeriod === "weekly" ? "active" : ""}`}
                    onClick={() => setLeaderboardPeriod("weekly")}
                  >
                    주간
                  </button>
                  <button
                    className={`period-tab ${leaderboardPeriod === "allTime" ? "active" : ""}`}
                    onClick={() => setLeaderboardPeriod("allTime")}
                  >
                    전체
                  </button>
                </div>
              </div>

              {/* 주간 랭킹 보상 활성화 조건 요약 박스 */}
              {leaderboardPeriod === "weekly" && (
                <div className="leaderboard-prizes">
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", marginBottom: "4px" }}>
                    <span style={{ color: "#ffd700" }}>🏆 주간 Top 3 상금 (비례 보상제)</span>
                    {participantsCount >= 30 ? (
                      <span style={{ color: "#4dff70" }}>활성화 (100%)</span>
                    ) : participantsCount >= 10 ? (
                      <span style={{ color: "#ffcc00" }}>부분 활성화 (50%)</span>
                    ) : (
                      <span style={{ color: "#ff4d4d" }}>비활성화</span>
                    )}
                  </div>
                  <div style={{ color: "#8c8c96", fontSize: "11px" }}>
                    이번 주 고유 참여자: <span style={{ color: "#ffd700", fontWeight: "bold" }}>{participantsCount}명</span> (최소 10명 시 50% 지급, 30명 시 100% 지급)
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "11px", color: "#d1d1d6", justifyContent: "space-between" }}>
                    <span>🥇 1등: {participantsCount >= 30 ? "500" : participantsCount >= 10 ? "250" : "0"}코인</span>
                    <span>🥈 2등: {participantsCount >= 30 ? "300" : participantsCount >= 10 ? "150" : "0"}코인</span>
                    <span>🥉 3등: {participantsCount >= 30 ? "100" : participantsCount >= 10 ? "50" : "0"}코인</span>
                  </div>
                </div>
              )}

              {/* Game Selector Tabs */}
              <div className="leaderboard-cat-tabs">
                <button
                  className={`leaderboard-cat-tab ${selectedLeaderboardGame === "breath" ? "active" : ""}`}
                  onClick={() => setSelectedLeaderboardGame("breath")}
                >
                  호흡 수련
                </button>
                <button
                  className={`leaderboard-cat-tab ${selectedLeaderboardGame === "pulse" ? "active" : ""}`}
                  onClick={() => setSelectedLeaderboardGame("pulse")}
                >
                  기응축
                </button>
                <button
                  className={`leaderboard-cat-tab ${selectedLeaderboardGame === "puzzle" ? "active" : ""}`}
                  onClick={() => setSelectedLeaderboardGame("puzzle")}
                >
                  내공 정렬
                </button>
                <button
                  className={`leaderboard-cat-tab ${selectedLeaderboardGame === "dodge" ? "active" : ""}`}
                  onClick={() => setSelectedLeaderboardGame("dodge")}
                >
                  보법 수련
                </button>
              </div>

              {/* Ranking List */}
              {loadingLeaderboard ? (
                <div style={{ padding: "40px 0", color: "#ffd700", fontWeight: 800, textAlign: "center" }}>전령 비급을 조회하는 중... 🍃</div>
              ) : (leaderboardPeriod === "weekly" ? weeklyRankings : allTimeRankings).length === 0 ? (
                <div style={{ padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center" }}>
                  기록된 수련 점수가 없습니다. 첫 강호 랭킹에 이름을 새기십시오!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(leaderboardPeriod === "weekly" ? weeklyRankings : allTimeRankings).map((rank, idx) => (
                    <div key={idx} className="rank-row">
                      <div className="rank-user">
                        <span className="rank-num">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                        <span className="rank-username">{rank.username}</span>
                      </div>
                      <span className="rank-score">{rank.score.toLocaleString()} 점</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 가이드 모달 */}
          {showGuideModal && (
            <div 
              className="guide-modal-overlay"
              onClick={() => setShowGuideModal(false)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "20px"
              }}
            >
              <div 
                className="training-guide-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  border: "1.5px solid rgba(255, 215, 0, 0.35)",
                }}
              >
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setShowGuideModal(false)}
                  style={{
                    position: "absolute",
                    top: "14px",
                    right: "14px",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "4px",
                    zIndex: 10
                  }}
                >
                  ✕
                </button>
                <div className="guide-header">
                  <span className="guide-icon">📖</span>
                  <h3 className="guide-title">무공수련 규정 비급</h3>
                </div>
                <div className="guide-body">
                  <div className="guide-section">
                    <div className="guide-section-title">🏆 주간 Top 3 비례 상금제 (대안 A)</div>
                    <div className="guide-section-desc">
                      주간 고유 수련 참여자 수에 비례하여 랭킹 보상이 차등 활성화됩니다. 참여율이 높을수록 상금이 증폭됩니다.
                      <div className="guide-sub-rules">
                        <div>• <strong>30명 이상 (100%):</strong> 1등 500 / 2등 300 / 3등 100 코인</div>
                        <div>• <strong>10명 ~ 30명 (50%):</strong> 1등 250 / 2등 150 / 3등 50 코인</div>
                        <div>• <strong>10명 미만 (비활성):</strong> 인원 미달 시 주간 상금 미지급</div>
                      </div>
                    </div>
                  </div>

                  <div className="guide-section">
                    <div className="guide-section-title">📅 일일 수련 임무 보상</div>
                    <div className="guide-section-desc">
                      매일 4종 무공 수련 중 아무 게임이나 1회 이상 완수하여 점수를 등록하십시오. 금일 수련이 마감되며 즉시 <strong>+10 코인</strong>의 일일 보상이 적립됩니다.
                    </div>
                  </div>

                  <div className="guide-section">
                    <div className="guide-section-title">⚖️ 수련 및 정산 규칙</div>
                    <div className="guide-section-desc">
                      • <strong>매주 월요일 00:00 KST</strong> 기준으로 지난주 랭킹 성적이 정산되어 지갑에 즉시 지급됩니다.<br />
                      • 비정상적인 방법으로 기록을 조작하거나 대리 수련 시, 공적 회수 및 플랫폼 이용 제재가 가해집니다.<br />
                      • 수련 항목은 추가되거나 교체 될 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 게임 실행 런처 모달 */}
      {activeLauncherGame && (
        <MugongGameLauncher
          gameId={activeLauncherGame}
          onClose={() => setActiveLauncherGame(null)}
          onFinished={handleGameFinished}
        />
      )}

      {/* 모바일 하단 네비게이션 바 */}
      <BottomNav />
    </main>
  );
}