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
  const { game } = useGameStore();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/me/game");
    }
  }, [loading, user, router]);

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
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "16px 12px",
          color: "white",
          background: "#05060b",
        }}
      >
        불러오는 중...
      </main>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "16px 12px",
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
        minHeight: "100vh",
        padding: "8px 8px 0",
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