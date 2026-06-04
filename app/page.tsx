"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import WorkPosterCard from "@/app/components/work/WorkPosterCard";
import BottomNav from "@/app/components/BottomNav";

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

  // ✅ 남은 미션 개수 상태
  const [remainingMissions, setRemainingMissions] = useState<number | null>(null);

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
          "youtube",
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

  // ✅ 검색어 및 탭 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("추천");

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
              firstEpisodeId,
              created_at: w.created_at
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
      result = result.filter((w) => w.badge === "신작");
    } else if (activeTab === "인기 순위") {
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

    return result;
  }, [searchQuery, activeTab, playCounts, worksList]);

  // 메인 그리드용 작품 (준비중인 작품 제외)
  const mainGridWorks = useMemo(() => {
    return filteredWorks.filter((w) => w.status !== "준비중");
  }, [filteredWorks]);

  // 공개 예정 섹션용 작품 (준비중인 작품만)
  const comingSoonWorks = useMemo(() => {
    return worksList
      .filter((w) => w.status === "준비중")
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
        }

        .category-tab {
          padding: 10px 0 12px;
          font-size: 17px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          position: relative;
          white-space: nowrap;
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

        <div className="header-icons mobile-only">
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
        {["추천", "신작", "인기 순위"].map((tab) => (
          <div
            key={tab}
            className={`category-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

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
            // created_at 기준 날짜 그룹핑
            const groups: { dateLabel: string; works: typeof comingSoonWorks }[] = [];
            comingSoonWorks.forEach((work) => {
              let dateLabel = "";
              if (work.created_at) {
                const d = new Date(work.created_at);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                dateLabel = `${mm}. ${dd}.`;
              }
              const existing = groups.find((g) => g.dateLabel === dateLabel);
              if (existing) {
                existing.works.push(work);
              } else {
                groups.push({ dateLabel, works: [work] });
              }
            });
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

      {/* 모바일 하단 네비게이션 바 */}
      <BottomNav />
    </main>
  );
}