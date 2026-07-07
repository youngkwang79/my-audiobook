"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import WorkPosterCard from "@/app/components/work/WorkPosterCard";
import BottomNav from "@/app/components/BottomNav";
import MugongGameLauncher from "@/app/components/game/MugongGameLauncher";
import GrandOpenPopup from "@/app/components/GrandOpenPopup";
import ComingSoonSection from "@/app/components/coming-soon/ComingSoonSection";
import PreparingSection from "@/app/components/coming-soon/PreparingSection";

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




export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, loading } = useAuth();

  const isAdmin = !!user && (
    user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || 
    user.email === "admin@murimbook.com" || 
    user.app_metadata?.role === "admin" || 
    user.user_metadata?.role === "admin"
  );

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loginHover, setLoginHover] = useState(false);

  // ✅ 검색어 및 탭 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("도움되는글");

  // ✅ 계산기 탭 관련 상태
  const [selectedCalculator, setSelectedCalculator] = useState<null | "jongbuse" | "loan" | "brokerage">(null);
  
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
  const [selectedRewardUserId, setSelectedRewardUserId] = useState<string | null>(null);
  const [selectedRewardUsername, setSelectedRewardUsername] = useState<string>("");
  const [rewardAmount, setRewardAmount] = useState<string>("100");
  const [rewardReason, setRewardReason] = useState<string>("무공수련 랭킹 보상");
  const [isSendingReward, setIsSendingReward] = useState(false);
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

   // 수련하기 숏컷 및 뒤로가기 탭 복원 쿼리 파라미터 처리
   useEffect(() => {
     if (typeof window !== "undefined") {
       const params = new URLSearchParams(window.location.search);
       const tabParam = params.get("tab");
       if (tabParam) {
         // ?tab=도움되는글 등 파라미터가 있으면 해당 탭 활성화
         setActiveTab(tabParam);
       } else if (params.get("openGameModal") === "1") {
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
              .filter((e: any) => isAdmin || new Date(e.release_date).getTime() <= Date.now())
              .sort((a: any, b: any) => {
                const aNum = parseFloat(a.id);
                const bNum = parseFloat(b.id);
                if (isNaN(aNum) || isNaN(bNum)) {
                  return String(a.id).localeCompare(String(b.id));
                }
                return aNum - bNum;
              });
            const firstEpisodeId = publishedEpisodes[0]?.id || null;

            // Determine if the work itself is published/active dynamically (지원: 예약 발행 기능)
            const isFutureScheduled = w.status === "공개예정" && w.created_at && new Date(w.created_at).getTime() > Date.now();
            const isPublished = (w.status !== "준비중" && !isFutureScheduled && (publishedEpisodes.length > 0 || (w.episodes || []).length === 0));

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
              play_count: Number(w.play_count ?? 0),
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
  }, [isAdmin]);

  const [shouldPulse, setShouldPulse] = useState(false);
  // play_count는 worksList에서 직접 로드 (works.play_count 컬럼)

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
    const work = worksList.find((w) => w.id === lastPlayed.workId);
    const isBlog = work?.subtitle?.includes("[블로그]") || work?.subtitle?.includes("[공지사항]") || work?.genre === "블로그" || work?.genre === "blog";
    if (isBlog) return "";
    return `/episode/${lastPlayed.workId}/${lastPlayed.episodeId}?part=${lastPlayed.part}&autoplay=1`;
  }, [lastPlayed, worksList]);
  const lastPlayedWorkTitle = useMemo(() => {
    if (!lastPlayed?.workId) return "";
    return worksList.find((work) => work.id === lastPlayed.workId)?.title ?? lastPlayed.workId;
  }, [lastPlayed, worksList]);

  // ✅ 검색 및 탭 필터링/정렬 로직
  const filteredWorks = useMemo(() => {
    // play_count를 views로 병합 (works 테이블의 play_count 컬럼)
    let result = worksList.map((w) => ({
      ...w,
      views: String(w.play_count ?? w.views ?? "0")
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
    if (activeTab === "도움되는글") {
      // 도움되는글 탭은 블로그/공지사항 글만 노출
      result = result.filter(
        (w) =>
          w.subtitle?.includes("[블로그]") ||
          w.subtitle?.includes("[공지사항]") ||
          w.genre === "블로그" ||
          w.genre === "blog"
      );
    } else if (activeTab === "무공 수련") {
      // 무공 수련 탭은 기존 로직 유지 (아래 119라인에서 별도 처리됨)
    } else {
      // 그 외 오디오북 탭들(추천, 신작, 인기 순위 등)에서는 블로그 글들을 완전히 제외하여 감춤
      result = result.filter(
        (w) =>
          !w.subtitle?.includes("[블로그]") &&
          !w.subtitle?.includes("[공지사항]") &&
          w.genre !== "블로그" &&
          w.genre !== "blog"
      );

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
      }
    }

    return result;
  }, [searchQuery, activeTab, worksList]);

  // 메인 그리드용 작품 (공개된 작품만)
  const mainGridWorks = useMemo(() => {
      const ordered = filteredWorks.filter((w) => w.isPublished);
      const bottomTitles = ["야장신검", "무명지협", "남궁의 잔혼", "하오의 비검"];
      // Stable sort: keep original order, but push bottom titles to end
      ordered.sort((a, b) => {
        const aBottom = bottomTitles.includes(a.title);
        const bBottom = bottomTitles.includes(b.title);
        if (aBottom && !bBottom) return 1;
        if (!aBottom && bBottom) return -1;
        return 0; // preserve relative order otherwise
      });
      return ordered;
    }, [filteredWorks]);

  // 공개 예정 섹션용 작품 (status === "공개예정" & 오디오북만)
  const comingSoonAudiobooks = useMemo(() => {
    return worksList
      .filter((w) => w.status === "공개예정" && !w.isPublished && !w.subtitle?.includes("[블로그]") && !w.subtitle?.includes("[공지사항]") && w.genre !== "블로그" && w.genre !== "blog")
      .map((w) => ({
        ...w,
        views: String(w.play_count ?? w.views ?? "0")
      }));
  }, [worksList]);

  // 공개 예정 섹션용 작품 (status === "공개예정" & 블로그만)
  const comingSoonBlogs = useMemo(() => {
    return worksList
      .filter((w) => w.status === "공개예정" && !w.isPublished && (w.subtitle?.includes("[블로그]") || w.subtitle?.includes("[공지사항]") || w.genre === "블로그" || w.genre === "blog"))
      .map((w) => ({
        ...w,
        views: String(w.play_count ?? w.views ?? "0")
      }));
  }, [worksList]);

  // 준비중 섹션용 작품 (status === "준비중" & 오디오북만)
  const preparingAudiobooks = useMemo(() => {
    return worksList
      .filter((w) => w.status === "준비중" && !w.subtitle?.includes("[블로그]") && !w.subtitle?.includes("[공지사항]") && w.genre !== "블로그" && w.genre !== "blog")
      .map((w) => ({
        ...w,
        views: String(w.play_count ?? w.views ?? "0")
      }));
  }, [worksList]);

  // 준비중 섹션용 작품 (status === "준비중" & 블로그만)
  const preparingBlogs = useMemo(() => {
    return worksList
      .filter((w) => w.status === "준비중" && (w.subtitle?.includes("[블로그]") || w.subtitle?.includes("[공지사항]") || w.genre === "블로그" || w.genre === "blog"))
      .map((w) => ({
        ...w,
        views: String(w.play_count ?? w.views ?? "0")
      }));
  }, [worksList]);

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

        @media (min-width: 768px) {
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media (min-width: 480px) {
          .coming-soon-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (min-width: 768px) {
          .coming-soon-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 20px;
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
        {["추천", "신작", "인기 순위", "무공 수련", "도움되는글", "계산기"].map((tab) => (
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
          {activeTab === "계산기" ? (
            <div className="works-poster-grid">
              {worksList
                .filter((w) => w.id.startsWith("calc-"))
                .map((work) => (
                  <div key={work.id} onClick={() => router.push(`/work/${work.id}?tab=계산기`)}>
                    <WorkPosterCard work={work} />
                  </div>
                ))}
            </div>
          ) : mainGridWorks.length > 0 ? (
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

          {/* 공개 예정 섹션 (추천 탭 - 오디오북) */}
          {activeTab === "추천" && !searchQuery && (
            <>
              <ComingSoonSection comingSoonWorks={comingSoonAudiobooks} shouldPulse={shouldPulse} />
              <PreparingSection preparingWorks={preparingAudiobooks} />
            </>
          )}

          {/* 공개 예정 섹션 (도움되는글 탭 - 블로그) */}
          {activeTab === "도움되는글" && !searchQuery && (
            <>
              <ComingSoonSection comingSoonWorks={comingSoonBlogs} shouldPulse={shouldPulse} />
              <PreparingSection preparingWorks={preparingBlogs} />
            </>
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
              if (!user) { alert("로그인 후 이용할 수 있습니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
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
              if (!user) { alert("로그인 후 이용할 수 있습니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
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
              if (!user) { alert("로그인 후 이용할 수 있습니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
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
              if (!user) { alert("로그인 후 이용할 수 있습니다. 문파 가입(로그인) 후 수련해 주세요!"); return; }
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
                        <span 
                          className="rank-username"
                          style={{
                            cursor: (isAdmin && rank.user_id) ? "pointer" : "inherit",
                            textDecoration: (isAdmin && rank.user_id) ? "underline" : "none",
                            color: (isAdmin && rank.user_id) ? "#ffd700" : "#ffffff",
                          }}
                          onClick={() => {
                            if (isAdmin && rank.user_id) {
                              setSelectedRewardUserId(rank.user_id);
                              setSelectedRewardUsername(rank.username);
                              setRewardAmount("100");
                              setRewardReason("무공수련 랭킹 보상");
                            }
                          }}
                        >
                          {rank.username}
                        </span>
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

      {/* 관리자 보상 지급 모달 */}
      {isAdmin && selectedRewardUserId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedRewardUserId(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#1c1c24",
              border: "1.5px solid rgba(255, 215, 0, 0.3)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#ffffff", textAlign: "center" }}>
              🎁 관리자 보상 지급
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "rgba(255, 255, 255, 0.7)", textAlign: "center" }}>
              대상 협객: <strong style={{ color: "#ffd700" }}>{selectedRewardUsername}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>지급할 코인 수량</label>
              <input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                style={{
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(0, 0, 0, 0.2)",
                  color: "#ffffff",
                  padding: "0 12px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>지급 사유</label>
              <input
                type="text"
                value={rewardReason}
                onChange={(e) => setRewardReason(e.target.value)}
                style={{
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(0, 0, 0, 0.2)",
                  color: "#ffffff",
                  padding: "0 12px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => setSelectedRewardUserId(null)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                disabled={isSendingReward}
                onClick={async () => {
                  const token = session?.access_token;
                  if (!token) {
                    alert("로그인 토큰이 만료되었습니다. 다시 로그인해주세요.");
                    return;
                  }

                  const amount = Number(rewardAmount);
                  if (isNaN(amount) || amount <= 0) {
                    alert("올바른 수량을 입력해주세요.");
                    return;
                  }

                  setIsSendingReward(true);
                  try {
                    const res = await fetch("/api/admin/grant-reward", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        userId: selectedRewardUserId,
                        amount,
                        reason: rewardReason,
                      }),
                    });

                    const data = await res.json().catch(() => null);

                    if (res.ok) {
                      alert(`🎉 ${selectedRewardUsername} 협객에게 ${amount} 코인을 성공적으로 지급했습니다!`);
                      setSelectedRewardUserId(null);
                      if (selectedRewardUserId === user?.id) {
                        window.dispatchEvent(new Event("wallet-updated"));
                      }
                    } else {
                      alert(`❌ 지급 실패: ${data?.error || "알 수 없는 오류"}`);
                    }
                  } catch (e) {
                    console.error(e);
                    alert("네트워크 오류가 발생했습니다.");
                  } finally {
                    setIsSendingReward(false);
                  }
                }}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #ffd700 0%, #ff9500 100%)",
                  color: "#1a1000",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                  opacity: isSendingReward ? 0.6 : 1,
                }}
              >
                {isSendingReward ? "지급 중..." : "지급하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3대 금융/부동산 계산기 팝업 모달 레이어 */}
      {selectedCalculator && (
        <CalculatorModal 
          type={selectedCalculator} 
          onClose={() => setSelectedCalculator(null)} 
        />
      )}

      {/* 이벤트 팝업 임시 비활성화 (구글봇 크롤링 방해 제거) */}
      {/* <GrandOpenPopup /> */}
 
      {/* 모바일 하단 네비게이션 바 */}
      <BottomNav />
    </main>
  );
}

// ==========================================
// 팝업 내부 연산을 처리할 계산기 전용 React 서브 컴포넌트
// ==========================================
interface CalcProps {
  type: "jongbuse" | "loan" | "brokerage";
  onClose: () => void;
}

function CalculatorModal({ type, onClose }: CalcProps) {
  // 1. 종부세 상태
  const [housePrice, setHousePrice] = useState("");
  const [ownerAge, setOwnerAge] = useState("59");
  const [holdYears, setHoldYears] = useState("4");
  const [taxResult, setTaxResult] = useState<any>(null);

  // 2. 대출 계산기 상태
  const [loanAmount, setLoanAmount] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [loanType, setLoanType] = useState("원리금균등");
  const [loanResult, setLoanResult] = useState<any>(null);

  // 3. 복비 계산기 상태
  const [brokerPrice, setBrokerPrice] = useState("");
  const [brokerType, setBrokerType] = useState("주택");
  const [brokerResult, setBrokerResult] = useState<any>(null);

  // --- 종부세 계산기 로직 ---
  const handleJongbuse = () => {
    const priceBillion = parseFloat(housePrice);
    if (!priceBillion || priceBillion <= 0) {
      alert("공시가격을 정확히 입력해 주세요!");
      return;
    }
    const price = priceBillion * 1000000000;
    
    // 공동명의 계산 (합산 24억 공제)
    let jointTax = 0;
    const half = price / 2;
    if (half > 1200000000) {
      jointTax = calcBaseJongbuse(half - 1200000000) * 2;
    }

    // 단독 명의 계산 (12억 공제 + 최대 80% 공제)
    let singleTax = 0;
    let base = 0;
    let rawTax = 0;
    let totalRate = 0;
    
    if (price > 1200000000) {
      base = price - 1200000000;
      rawTax = calcBaseJongbuse(base);

      let ageRate = 0;
      const ageVal = parseInt(ownerAge);
      if (ageVal >= 70) ageRate = 0.4;
      else if (ageVal >= 65) ageRate = 0.3;
      else if (ageVal >= 60) ageRate = 0.2;

      let holdRate = 0;
      const holdVal = parseInt(holdYears);
      if (holdVal >= 15) holdRate = 0.5;
      else if (holdVal >= 10) holdRate = 0.4;
      else if (holdVal >= 5) holdRate = 0.2;

      totalRate = ageRate + holdRate;
      if (totalRate > 0.8) totalRate = 0.8;

      singleTax = rawTax * (1 - totalRate);
    }

    setTaxResult({
      joint: jointTax,
      single: singleTax,
      base: base,
      rawTax: rawTax,
      rate: totalRate * 100,
      saving: Math.max(0, jointTax - singleTax)
    });
  };

  const calcBaseJongbuse = (base: number) => {
    if (base <= 0) return 0;
    if (base <= 300000000) return base * 0.005;
    if (base <= 600000000) return 1500000 + (base - 300000000) * 0.007;
    if (base <= 1200000000) return 3600000 + (base - 600000000) * 0.01;
    if (base <= 2500000000) return 9600000 + (base - 1200000000) * 0.015;
    return 29100000 + (base - 2500000000) * 0.02;
  };

  // --- 대출 계산기 로직 (회차별 리포트 스케줄러 구현) ---
  const handleLoan = () => {
    const principal = parseFloat(loanAmount) * 10000; // 만원 단위 변환
    const annualRate = parseFloat(loanRate);
    const rateMonthly = annualRate / 12 / 100;
    const months = parseInt(loanTerm);

    if (!principal || !rateMonthly || !months) {
      alert("대출 정보를 모두 정확히 입력해 주세요!");
      return;
    }

    let schedule = [];
    let totalInterest = 0;
    let remainingPrincipal = principal;

    if (loanType === "원리금균등") {
      const monthlyRepayment = (principal * rateMonthly * Math.pow(1 + rateMonthly, months)) / (Math.pow(1 + rateMonthly, months) - 1);
      
      for (let i = 1; i <= months; i++) {
        const interest = remainingPrincipal * rateMonthly;
        const principalPaid = monthlyRepayment - interest;
        remainingPrincipal -= principalPaid;
        totalInterest += interest;

        schedule.push({
          seq: i,
          repayment: monthlyRepayment,
          principal: principalPaid,
          interest: interest,
          balance: Math.max(0, remainingPrincipal)
        });
      }
    } else {
      // 원금균등 방식
      const monthlyPrincipal = principal / months;
      
      for (let i = 1; i <= months; i++) {
        const interest = remainingPrincipal * rateMonthly;
        remainingPrincipal -= monthlyPrincipal;
        totalInterest += interest;

        schedule.push({
          seq: i,
          repayment: monthlyPrincipal + interest,
          principal: monthlyPrincipal,
          interest: interest,
          balance: Math.max(0, remainingPrincipal)
        });
      }
    }

    setLoanResult({
      monthly: schedule[0].repayment,
      interest: totalInterest,
      total: principal + totalInterest,
      schedule: schedule
    });
  };

  // --- 부동산 복비 계산기 로직 ---
  const handleBrokerage = () => {
    const price = parseFloat(brokerPrice) * 100000000; // 억 단위 변환
    if (!price || price <= 0) {
      alert("거래 금액을 입력해 주세요!");
      return;
    }

    let rate = 0.004;
    let limit = 0;

    if (brokerType === "주택") {
      if (price < 50000000) { rate = 0.006; limit = 250000; }
      else if (price < 200000000) { rate = 0.005; limit = 800000; }
      else if (price < 900000000) { rate = 0.004; }
      else if (price < 1200000000) { rate = 0.005; }
      else if (price < 1500000000) { rate = 0.006; }
      else { rate = 0.007; }
    } else {
      rate = 0.009;
    }

    let fee = price * rate;
    let overLimit = false;
    if (limit > 0 && fee > limit) {
      fee = limit;
      overLimit = true;
    }

    setBrokerResult({
      fee,
      rate: rate * 100,
      limit: limit,
      overLimit
    });
  };

  const formatWon = (val: number) => {
    if (!val || val === 0) return "0 원";
    return Math.round(val).toLocaleString("ko-KR") + " 원";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "90dvh",
          background: "#1c1c24",
          border: "1.5px solid rgba(255, 42, 95, 0.25)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            fontSize: "20px",
            cursor: "pointer",
            outline: "none",
            zIndex: 100
          }}
        >
          ✕
        </button>

        {/* 1. 종부세 계산기 UI */}
        {type === "jongbuse" && (
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 19, fontWeight: 900, color: "#ffffff" }}>
              📊 종부세 부부 공동명의 절세 계산기
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
              단독 1주택 특례와 공동명의 기본 과세 혜택을 즉석 대조합니다.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>아파트 공시가격 (억원)</label>
                <input 
                  type="number" 
                  value={housePrice} 
                  onChange={(e) => setHousePrice(e.target.value)} 
                  placeholder="예: 15"
                  style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>납세자 연령 (만 나이)</label>
                  <select 
                    value={ownerAge} 
                    onChange={(e) => setOwnerAge(e.target.value)}
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 13, fontWeight: 700 }}
                  >
                    <option value="59">만 60세 미만</option>
                    <option value="60">만 60세~64세 (20%)</option>
                    <option value="65">만 65세~69세 (30%)</option>
                    <option value="70">만 70세 이상 (40%)</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>주택 보유 기간</label>
                  <select 
                    value={holdYears} 
                    onChange={(e) => setHoldYears(e.target.value)}
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 13, fontWeight: 700 }}
                  >
                    <option value="4">5년 미만</option>
                    <option value="5">5년~10년 미만 (20%)</option>
                    <option value="10">10년~15년 미만 (40%)</option>
                    <option value="15">15년 이상 (50%)</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleJongbuse}
                style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer", marginTop: 10 }}
              >
                절세 혜택 분석하기
              </button>

              {taxResult && (
                <div style={{ marginTop: 14, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span>공동명의 기본 과세액:</span>
                    <strong style={{ color: "#ffffff" }}>{formatWon(taxResult.joint)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span>단독 특례 신청 과세액:</span>
                    <strong style={{ color: "#ffffff" }}>{formatWon(taxResult.single)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    <span>단독 특례 공제율:</span>
                    <strong>{taxResult.rate} % (최대 80% 한도)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5 }}>
                    <span style={{ fontWeight: 800 }}>최종 절감 가능 세액:</span>
                    <strong style={{ color: "#ff2a5f", fontWeight: 900 }}>{formatWon(taxResult.saving)}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* SEO 가이드 텍스트 내장 */}
            <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <h4 style={{ color: "#ffd43b", margin: "0 0 8px 0", fontSize: 14, fontWeight: 900 }}>💡 종합부동산세 부부 공동명의 특례 절세 비법 가이드</h4>
              부부 공동명의 상태에서 아파트 1채를 지분 50:50으로 소유하면 인당 12억 원씩 총 24억 원의 기본 공제 혜택을 획득합니다. 그러나 주택 보유 기간이 5년 이상을 지나고 만 60세가 넘는 경우, 기본 공제를 12억 원으로 줄이는 대신 고령자 세액공제(최대 40%)와 장기보유 세액공제(최대 50%)를 결합하여 납부 세액을 최대 80% 깎아내는 '1세대 1주택자 단독 명의 과세 특례'가 훨씬 유리할 수 있습니다. 매년 9월 16일부터 30일 사이에 국세청 홈택스나 관할 세무서에 특례 신청서를 반드시 접수하셔야 이 혜택을 적용받을 수 있습니다.
            </div>
          </div>
        )}

        {/* 2. 대출 계산기 UI (회차별 스케줄러 리포트 표 포함) */}
        {type === "loan" && (
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 19, fontWeight: 900, color: "#ffffff" }}>
              💵 무료 대출 이자 상환 계산기
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
              이율과 납입 기간에 따른 매월 상환 이자 부담을 모의 연산합니다.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>대출 금액 (만원)</label>
                <input 
                  type="number" 
                  value={loanAmount} 
                  onChange={(e) => setLoanAmount(e.target.value)} 
                  placeholder="예: 10000"
                  style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>대출 기간 (개월)</label>
                  <input 
                    type="number" 
                    value={loanTerm} 
                    onChange={(e) => setLoanTerm(e.target.value)} 
                    placeholder="예: 24"
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 14, fontWeight: 700 }}
                  />
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>연 이자율 (%)</label>
                  <input 
                    type="number" 
                    value={loanRate} 
                    onChange={(e) => setLoanRate(e.target.value)} 
                    placeholder="예: 4.5"
                    step="0.1"
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 14, fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>상환 방식 선택</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["원리금균등", "원금균등"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLoanType(mode)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: "1.5px solid " + (loanType === mode ? "#ff2a5f" : "rgba(255,255,255,0.1)"),
                        background: loanType === mode ? "rgba(255,42,95,0.1)" : "none",
                        color: "white",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleLoan}
                style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer", marginTop: 10 }}
              >
                매월 이자 상환액 산정하기
              </button>

              {loanResult && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                      <span>첫 달 원리금 상환액:</span>
                      <strong style={{ color: "#ffffff" }}>{formatWon(loanResult.monthly)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                      <span>대출 총 납부 이자:</span>
                      <strong style={{ color: "#ffffff" }}>{formatWon(loanResult.interest)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5 }}>
                      <span style={{ fontWeight: 800 }}>총 상환 합계액:</span>
                      <strong style={{ color: "#ff2a5f", fontWeight: 900 }}>{formatWon(loanResult.total)}</strong>
                    </div>
                  </div>

                  {/* 📊 회차별 디테일 상환 보고서 스케줄 표 */}
                  <h4 style={{ margin: "10px 0 4px 0", fontSize: 14, fontWeight: 900, color: "#ffd43b" }}>
                    📊 회차별 상세 상환 스케줄러 리포트 (상세 내역)
                  </h4>
                  <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: 8 }}>회차</th>
                          <th style={{ padding: 8 }}>납부금액</th>
                          <th style={{ padding: 8 }}>납부원금</th>
                          <th style={{ padding: 8 }}>납부이자</th>
                          <th style={{ padding: 8 }}>대출잔액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loanResult.schedule.map((row: any) => (
                          <tr key={row.seq} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: 8, fontWeight: 700 }}>{row.seq}회</td>
                            <td style={{ padding: 8, color: "#ffd43b" }}>{formatWon(row.repayment)}</td>
                            <td style={{ padding: 8 }}>{formatWon(row.principal)}</td>
                            <td style={{ padding: 8 }}>{formatWon(row.interest)}</td>
                            <td style={{ padding: 8, color: "rgba(255,255,255,0.5)" }}>{formatWon(row.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SEO 가이드 텍스트 내장 */}
            <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <h4 style={{ color: "#ffd43b", margin: "0 0 8px 0", fontSize: 14, fontWeight: 900 }}>💡 대출 이자 계산 시 상환 방식(원리금균등 vs 원금균등) 필수 팁</h4>
              원리금균등분할상환 방식은 만기까지 매달 납부해야 할 원금과 이자의 합계액이 완벽히 동일하여 가계 예산이나 점포의 고정 지출 자금 계획을 짜기에 매우 용이합니다. 반면, 원금균등분할상환 방식은 원금을 매달 균등하게 쪼개 갚으므로 회차가 거듭될수록 남아 있는 대출 잔액에 이자가 적게 붙어 최종 총 이자 납부액 측면에서는 원리금 방식보다 더 저렴하다는 절대적인 강점이 있습니다. 본 계산기의 회차별 리포트 표를 대조하여 지갑 사정에 최적화된 상환 전략을 구축해 보십시오.
            </div>
          </div>
        )}

        {/* 3. 복비 계산기 UI */}
        {type === "brokerage" && (
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 19, fontWeight: 900, color: "#ffffff" }}>
              🏠 부동산 중개 수수료 계산기
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
              주택 및 토지거래 한도 요율별 법정 복비 상한선을 연산합니다.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>부동산 구분</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["주택", "오피스텔/기타"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBrokerType(mode)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: "1.5px solid " + (brokerType === mode ? "#ff2a5f" : "rgba(255,255,255,0.1)"),
                        background: brokerType === mode ? "rgba(255,42,95,0.1)" : "none",
                        color: "white",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>거래 가액 (억원)</label>
                <input 
                  type="number" 
                  value={brokerPrice} 
                  onChange={(e) => setBrokerPrice(e.target.value)} 
                  placeholder="예: 6.5"
                  step="0.1"
                  style={{ height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "white", padding: "0 12px", outline: "none", fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <button 
                onClick={handleBrokerage}
                style={{ height: 46, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #ff2a5f 0%, #d01c4c 100%)", color: "white", fontWeight: 900, cursor: "pointer", marginTop: 10 }}
              >
                법정 한도 복비 연산하기
              </button>

              {brokerResult && (
                <div style={{ marginTop: 14, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
                    <span>적용 상한 요율:</span>
                    <strong style={{ color: "#ffffff" }}>{brokerResult.rate} %</strong>
                  </div>
                  {brokerResult.overLimit && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#ffd43b" }}>
                      <span>한도액 제한 적용됨:</span>
                      <strong>최대 {formatWon(brokerResult.limit)} 한도</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, fontSize: 14.5 }}>
                    <span style={{ fontWeight: 800 }}>최대 중개 수수료 한도:</span>
                    <strong style={{ color: "#ff2a5f", fontWeight: 900 }}>{formatWon(brokerResult.fee)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
