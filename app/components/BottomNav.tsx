"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import Link from "next/link";

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

function CommunityIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#8c8c96"}>
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
    </svg>
  );
}

function BlogIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#8c8c96"}>
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          height: calc(58px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: #000000;
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
      `}</style>
      <div className="bottom-nav">
        <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`}>
          <HomeIcon active={pathname === "/"} />
          <span>홈</span>
        </Link>
        <Link href="/community" className={`nav-item ${pathname === "/community" ? "active" : ""}`}>
          <CommunityIcon active={pathname === "/community"} />
          <span>강호게시판</span>
        </Link>
        <Link href="/works" className={`nav-item ${pathname === "/works" ? "active" : ""}`}>
          <LibraryIcon active={pathname === "/works"} />
          <span>보관함</span>
        </Link>
        <a href="https://blog.murimbook.com" className="nav-item">
          <BlogIcon active={false} />
          <span>블로그</span>
        </a>
        <Link href={user ? "/me" : "/login"} className={`nav-item nav-item-my ${(pathname === "/me" || pathname === "/wallet" || pathname === "/checkin") ? "active" : ""}`}>
          <UserIcon active={pathname === "/me" || pathname === "/wallet" || pathname === "/checkin" || pathname === "/login"} />
          <span>내정보</span>
          <div className="my-red-dot"></div>
        </Link>
      </div>
    </>
  );
}
