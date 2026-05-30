"use client";

import TopBar from "@/app/components/TopBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { works } from "./data/works";
import WorkPosterCard from "@/app/components/work/WorkPosterCard";

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

function CrownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5d0" />
          <stop offset="50%" stopColor="#f7d070" />
          <stop offset="100%" stopColor="#d4a23c" />
        </linearGradient>
      </defs>
      <path d="M2 4.5l3.5 11h13L22 4.5l-5 4.5-5-6.5-5 6.5-5-4.5z" fill="url(#crownGrad)" />
      <path d="M5.5 17h13v2h-13z" fill="url(#crownGrad)" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
      <rect x="3" y="9" width="18" height="11" rx="2" fill="#fca834" />
      <rect x="2" y="6" width="20" height="3" rx="1" fill="#e28714" />
      <path d="M12 6v14M3 12h18" stroke="#ff3b30" strokeWidth="2" />
      <path d="M12 6c-1.2-2-3-2-3 0s1.8 2 3 0zm0 0c1.2-2 3-2 3 0s-1.8 2-3 0z" fill="#ff3b30" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#8c8c96"}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#8c8c96"}>
      <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#8c8c96"}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loginHover, setLoginHover] = useState(false);

  // ✅ 검색어 및 탭 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("추천");

  // ✅ 이어듣기 정보
  const [lastPlayed, setLastPlayed] = useState<LastPlayed | null>(null);

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
    return works.find((work) => work.id === lastPlayed.workId)?.title ?? lastPlayed.workId;
  }, [lastPlayed]);

  // ✅ 검색 및 탭 필터링/정렬 로직
  const filteredWorks = useMemo(() => {
    let result = works;

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
  }, [searchQuery, activeTab]);

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
          .bottom-nav {
            display: none !important;
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

        /* 바텀 네비게이션 */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(58px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: #09090b;
          border-top: 1px solid #1c1c24;
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 10000;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #8c8c96;
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
          flex: 1;
          height: 100%;
          justify-content: center;
        }

        .nav-item.active {
          color: #ffffff;
        }

        .nav-item-my {
          position: relative;
        }

        .my-red-dot {
          position: absolute;
          top: 8px;
          right: 32%;
          width: 5px;
          height: 5px;
          background: #ff2a5f;
          border-radius: 50%;
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
          <button className="icon-btn" onClick={() => router.push("/points")} title="포인트 충전">
            <CrownIcon />
          </button>
          <button className="icon-btn" onClick={() => router.push("/faq")} title="도움말">
            <GiftIcon />
            <div className="gift-badge">+10</div>
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
      {filteredWorks.length > 0 ? (
        <div className="works-poster-grid">
          {filteredWorks.map((work) => (
            <WorkPosterCard key={work.id} work={work} />
          ))}
        </div>
      ) : (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: 15 }}>
          검색 결과에 맞는 작품이 없습니다.
        </div>
      )}

      {/* 모바일 하단 네비게이션 바 */}
      <div className="bottom-nav">
        <div className={`nav-item ${pathname === "/" ? "active" : ""}`} onClick={() => router.push("/")}>
          <HomeIcon active={pathname === "/"} />
          <span>홈</span>
        </div>
        <div className={`nav-item ${pathname === "/works" ? "active" : ""}`} onClick={() => router.push("/works")}>
          <LibraryIcon active={pathname === "/works"} />
          <span>보관함</span>
        </div>
        <div className={`nav-item nav-item-my ${pathname === "/me" ? "active" : ""}`} onClick={() => router.push(user ? "/me" : "/login")}>
          <UserIcon active={pathname === "/me" || pathname === "/login"} />
          <span>마이</span>
          {/* 알림을 상징하는 빨간 점 */}
          <div className="my-red-dot"></div>
        </div>
      </div>
    </main>
  );
}