"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { useGameStore } from "@/app/lib/game/useGameStore";
import GameShell from "@/app/components/game/GameShell";
import GameIntroPanel from "@/app/components/game/GameIntroPanel";

export default function MeGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { game, syncToCloud, isSyncingFromCloud } = useGameStore(); // [시스템 삽입] syncToCloud, isSyncingFromCloud 추가

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/me/game");
    }
  }, [loading, user, router]);

  // [시스템 삽입] 컴포넌트 마운트 시 클라우드 데이터 동기화 시도 (로그인 직후 초기화 방지)
  useEffect(() => {
    const { syncFromCloud } = useGameStore.getState();
    if (user) {
      syncFromCloud();
    }
  }, [user]);
  
  // [시스템 삽입] 모바일에서 화면이 밀리는 현상(바운스/슬라이드) 방지를 위한 바디 고정
  useEffect(() => {
    const originalStyles = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height,
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.overscrollBehavior = originalStyles.overscrollBehavior;
      document.body.style.position = originalStyles.position;
      document.body.style.width = originalStyles.width;
      document.body.style.height = originalStyles.height;
    };
  }, []);

  const handleChangeHero = useCallback(
    (next: { name?: string; age?: number; height?: number }) => {
      useGameStore.setState((s) => {
        const sameName = (next.name ?? s.game.name) === s.game.name;
        const sameAge = (next.age ?? s.game.age) === s.game.age;
        const sameHeight = (next.height ?? s.game.height) === s.game.height;

        if (sameName && sameAge && sameHeight) {
          return s;
        }

        return {
          game: {
            ...s.game,
            ...next,
          },
        };
      });
    },
    []
  );

  const handleSelectFaction = useCallback((f: any) => {
    useGameStore.setState((s) => {
      if (s.game.faction === f) {
        return s;
      }

      return {
        game: {
          ...s.game,
          faction: f,
        },
      };
    });
  }, []);

  const handleStart = useCallback(() => {
    useGameStore.setState((s) => {
      if (s.game.isInitialized) {
        return s;
      }

      return {
        game: {
          ...s.game,
          isInitialized: true,
          factionLocked: true,
        },
      };
    });
    // [시스템 삽입] 시작 시점에 한 번 저장
    useGameStore.getState().syncToCloud();
  }, []);



  if (loading || (isSyncingFromCloud && !game.isInitialized)) {
    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          overscrollBehavior: "none",
          color: "white",
          background: "#05060b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🏮</div>
          <div style={{ fontSize: 16, opacity: 0.8 }}>강호의 기록을 불러오는 중...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          overscrollBehavior: "none",
          color: "white",
          background: "#05060b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.85 }}>
          세션이 만료되거나 로그아웃 되었습니다.
        </div>
        <button
          onClick={() => router.push("/login?redirect=/me/game")}
          style={{
            background: "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
            color: "#2b1d00",
            border: "1px solid rgba(255,215,120,0.7)",
            padding: "14px 28px",
            borderRadius: 16,
            fontWeight: 900,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
          }}
        >
          로그인 페이지로 가기
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        overscrollBehavior: "none",
        color: "white",
        background: "#05060b",
      }}
    >
      {!game.isInitialized ? (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 24,
          }}
        >
          <GameIntroPanel
            hero={{ name: game.name, age: game.age, height: game.height }}
            faction={game.faction}
            onChangeHero={handleChangeHero}
            onSelectFaction={handleSelectFaction}
            onStart={handleStart}
          />
        </div>
      ) : (
        <GameShell />
      )}
    </main>
  );
}