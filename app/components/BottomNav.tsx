"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

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

export default function BottomNav() {
  const router = useRouter();
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
          <span>내정보</span>
          <div className="my-red-dot"></div>
        </div>
      </div>
    </>
  );
}
