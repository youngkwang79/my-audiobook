# Deprecated Code Backup
This file contains the complete backup of unused files and components before they were deleted during the dead code cleanup.

## File: app/components/Header.tsx
```typescript
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { useGameStore } from "@/app/lib/game/useGameStore"; // [수정] 게임 스토어 가져오기

export default function Header() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { syncToCloud, triggerSave } = useGameStore(); // [수정] 동기화 함수 추출

  const handleLogout = async () => {
    // 1. 로그아웃 전 즉시 서버에 현재 데이터 저장 (가장 중요)
    try {
      console.log("로그아웃 전 데이터 동기화 중...");
      await syncToCloud(); //
    } catch (e) {
      console.error("로그아웃 전 동기화 실패:", e);
    }

    // 2. 실제 로그아웃 실행
    await signOut();

    // 3. 로컬 스토리지 정리 (주의: 게임 데이터 관련 키가 있다면 삭제하지 않아야 재접속 시 유지됨)
    try {
      // 기존에 있던 'points' 등을 지우면 로그아웃 시 로컬 데이터가 날아갑니다.
      // 만약 로그아웃 후에도 기기에 데이터를 남기고 싶다면 아래 localStorage 관련 줄들을 주석 처리하세요.
      localStorage.removeItem("points");
      localStorage.removeItem("lastPlayed");
      
      // 만약 'murimbook-game-save-v12' 같은 게임 저장 키가 있다면 여기서 지우지 마세요.
    } catch (e) {
      console.error("localStorage cleanup error:", e);
    }

    router.replace("/");
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        backdropFilter: "blur(10px)",
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          color: "white",
          textDecoration: "none",
          fontWeight: 800,
        }}
      >
        홈
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {loading ? (
          <span style={{ opacity: 0.8 }}>로딩중...</span>
        ) : user ? (
          <>
            <span style={{ opacity: 0.9, fontSize: 12 }}>
              로그인: {user.email ?? "사용자"}
            </span>

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        )}
      </div>
    </div>
  );
}
```

## File: app/components/game/elements/Dummy.tsx
```typescript
// app/components/game/elements/Dummy.tsx
"use client";
import { useState } from "react";

export default function Dummy({ onHit }: { onHit: (isCritical: boolean) => void }) {
  const [isHit, setIsHit] = useState(false);

  const handleClick = () => {
    setIsHit(true);
    const isCritical = Math.random() < 0.1; // 10% 확률 크리티컬
    onHit(isCritical);
    setTimeout(() => setIsHit(false), 50);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        transform: isHit ? "scale(0.95) translateY(5px)" : "scale(1)",
        transition: "transform 0.05s",
        cursor: "pointer",
        textAlign: "center"
      }}
    >
      {/* 여기에 기존의 허수아비 이미지나 SVG 코드를 넣으세요 */}
      <img src="/dummy.png" alt="허수아비" style={{ width: 200 }} />
    </div>
  );
}
```

## File: app/components/game/factions.ts
```typescript

```

## File: app/components/game/storage.ts
```typescript

```

## File: app/components/work/WorkCard.tsx
```typescript
import Link from "next/link";
import type { Work } from "@/app/data/works";

type Props = {
  work: Work;
};

export default function WorkCard({ work }: Props) {
  return (
    <>
      <style>{`
        .work-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          flex-direction: column;

          /* 배경 거의 없음 */
          background: rgba(255, 255, 255, 0.015);

          /* iPhone 차이 줄이려고 블러 제거 */
          backdrop-filter: none;
          -webkit-backdrop-filter: none;

          border: 1px solid rgba(255, 215, 120, 0.12);
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.14),
            0 0 6px rgba(255, 215, 120, 0.04);

          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .work-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 215, 120, 0.18);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.18),
            0 0 10px rgba(255, 215, 120, 0.06);
        }

        .work-card-thumb-wrap {
          position: relative;
          width: 100%;
          flex-shrink: 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.01);
          aspect-ratio: 16 / 9; /* Enforce strict aspect ratio on mobile */
        }

        .work-card-thumb {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover; /* Cover ensures all images fill the space without distortion */
          opacity: 1;
          filter: none;
        }

        /* 썸네일 위 덮는 막도 거의 제거 */
        .work-card-thumb-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.01) 0%,
              rgba(0, 0, 0, 0.02) 60%,
              rgba(0, 0, 0, 0.04) 100%
            );
        }

        .work-card-body {
          position: relative;
          padding: 18px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 10px;

          /* 본문 배경도 아주 약하게 */
          background: rgba(7, 10, 22, 0.06);

          backdrop-filter: none;
          -webkit-backdrop-filter: none;

          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }

        .work-card-title {
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          line-height: 1.25;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.96);
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        }

        .work-card-desc {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.6;
          margin: 0;
          word-break: keep-all;
          color: rgba(255, 255, 255, 0.82);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          white-space: pre-wrap;
        }

        .work-card-meta {
          font-size: 15px;
          font-weight: 800;
          margin: 0;
          color: rgba(255, 245, 210, 0.88);
        }

        .work-card-btn {
          margin-top: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 140px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f6e7a1, #c9a94d);
          color: #1d1607;
          font-size: 17px;
          font-weight: 900;
          text-decoration: none;
          box-shadow:
            0 0 8px rgba(255, 215, 120, 0.08),
            0 4px 10px rgba(0, 0, 0, 0.12);
        }

        @media (max-width: 768px) {
          .work-card {
            background: rgba(255, 255, 255, 0.012);
            border: 1px solid rgba(255, 215, 120, 0.10);
            box-shadow:
              0 5px 14px rgba(0, 0, 0, 0.12),
              0 0 4px rgba(255, 215, 120, 0.03);
          }

          .work-card-thumb-wrap {
            background: rgba(255, 255, 255, 0.008);
            aspect-ratio: 16 / 9; /* Consistent on mobile */
          }

          .work-card-thumb-wrap::after {
            background:
              linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.008) 0%,
                rgba(0, 0, 0, 0.015) 60%,
                rgba(0, 0, 0, 0.03) 100%
              );
          }

          .work-card-body {
            background: rgba(7, 10, 22, 0.045);
          }
        }

        @media (min-width: 900px) {
          .work-card {
            display: grid;
            grid-template-columns: 200px 1fr; /* Set a standard column width for desktop */
            align-items: stretch;
            min-height: 280px;
          }

          .work-card-thumb-wrap {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 2 / 3; /* Fixed vertical aspect-ratio on desktop */
          }

          .work-card-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: transparent;
          }

          .work-card-body {
            padding: 26px 28px;
            justify-content: center;
            gap: 14px;
            border-top: 0;
            border-left: 1px solid rgba(255, 255, 255, 0.03);
          }

          .work-card-title {
            font-size: 30px;
          }

          .work-card-desc {
            font-size: 19px;
            line-height: 1.55;
            max-width: 760px;
          }

          .work-card-meta {
            font-size: 17px;
          }

          .work-card-btn {
            width: 150px;
            max-width: none;
            height: 50px;
            font-size: 18px;
          }
        }
      `}</style>

      <div className="work-card">
        <div className="work-card-thumb-wrap">
          <img
            src={work.thumbnail}
            alt={work.title}
            className="work-card-thumb"
          />
        </div>

        <div className="work-card-body">
          <h2 className="work-card-title">{work.title}</h2>

          <p className="work-card-desc">{work.description}</p>

          <p className="work-card-meta">
            총 {work.episodeCount}화 · {work.status}
          </p>

          <Link href={`/work/${work.id}`} className="work-card-btn">
            작품 보기
          </Link>
        </div>
      </div>
    </>
  );
}
```

## File: app/lib/_game_types.ts
```typescript
export type Mission = {
  id: number;
  target: number;
  reward: "buff" | "weapon";
  completed: boolean;
  claimed: boolean;
};

export type CoinDrop = {
  id: number;
  x: number;
  y: number;
  amount: number;
};
```

## File: app/lib/game/martialBooks.ts
```typescript
export const MARTIAL_BOOKS = {
  "필부": { damage: 1000, critBonus: 5 },
  "삼류": { damage: 2000, critBonus: 10 },
  "이류": { damage: 4000, critBonus: 15 },
  "일류": { damage: 7000, critBonus: 20 },
  "절정": { damage: 10000, critBonus: 25 },
  "초절정": { damage: 30000, critBonus: 30 },
  "화경": { damage: 100000, critBonus: 35 },
  "현경": { damage: 150000, critBonus: 40 },
  "생사경": { damage: 500000, critBonus: 50 },
  "신화경": { damage: 1000000, critBonus: 70 },
  "천인합일": { damage: 2000000, critBonus: 99 },
};
```

## File: app/lib/game/shop.ts
```typescript

```

## File: app/lib/game/unlocks.ts
```typescript

```

## File: app/lib/payment.ts
```typescript
// lib/payment.ts
import { requestPayment } from "@portone/browser-sdk/v2";

export const executePayment = async ({
    amount,
    orderName,
    paymentId,
}: {
    amount: number;
    orderName: string;
    paymentId: string;
}) => {
    // 포트원 테스트 상점 ID를 넣으세요
    const response = await requestPayment({
        storeId: "store-8054c58a-c4b5-41b0-bb69-3c1aaf372ea4",
        channelKey: "channel-key-10ae1c88-a130-4f80-82b3-dd268f9b4ae4",
        paymentId: paymentId,
        orderName: orderName,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
    });

    if (response.code != null) {
        throw new Error(response.message);
    }
    return response;
};
```

## File: lib/supabaseAdmin.ts
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
```

