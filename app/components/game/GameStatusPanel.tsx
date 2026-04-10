"use client";

import { useState } from "react";
import { useGameStore, REALM_SETTINGS } from "@/app/lib/game/useGameStore";
import CharacterModal from "./CharacterModal";

export default function GameStatusPanel({ game }: { game: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getTotalAttack } = useGameStore();

  // 데이터 유실 방지를 위한 초기화 및 매핑
  const safeGame: any = {
    ...game,
    ownedWeapons: Array.isArray(game?.ownedWeapons) ? game.ownedWeapons : [],
    learnedSkills: Array.isArray(game?.learnedSkills) ? game.learnedSkills : [],
    exp: game?.exp ?? 0,
    touches: game?.touches ?? 0,
    coins: game?.coins ?? 0,
    reputation: game?.reputation ?? 0,
    realm: game?.realm ?? "필부",
    faction: game?.faction ?? "무소속",
    hp: game?.hp ?? 150,
    maxHp: game?.maxHp ?? 150,
    mp: game?.mp ?? 60,
    maxMp: game?.maxMp ?? 60,
  };

  const equippedWeapon =
    safeGame.ownedWeapons.find((item: any) => item.id === safeGame.equippedWeaponId) ?? null;

  // 최종 공격력 산출
  const totalAttack = getTotalAttack();

  // 경지 돌파 진행도 계산
  const realmKeys = Object.keys(REALM_SETTINGS);
  const currentIndex = realmKeys.indexOf(safeGame.realm);
  const nextRealm = currentIndex >= 0 ? realmKeys[currentIndex + 1] : null;
  const nextRealmInfo = nextRealm ? (REALM_SETTINGS as any)[nextRealm] : null;
  const currentRealmInfo =
    currentIndex >= 0 ? (REALM_SETTINGS as any)[safeGame.realm] : REALM_SETTINGS["필부"];

  const currentMinTouches = currentRealmInfo?.minTouches ?? 0;
  const nextMinTouches = nextRealmInfo?.minTouches ?? currentMinTouches;
  const requiredTouches = Math.max(1, nextMinTouches - currentMinTouches);
  const currentProgressTouches = Math.max(0, safeGame.touches - currentMinTouches);

  const progressPercent = nextRealmInfo
    ? Math.min((currentProgressTouches / requiredTouches) * 100, 100)
    : 100;

  const hpPercent = safeGame.maxHp > 0 ? Math.min((safeGame.hp / safeGame.maxHp) * 100, 100) : 0;
  const mpPercent = safeGame.maxMp > 0 ? Math.min((safeGame.mp / safeGame.maxMp) * 100, 100) : 0;

  return (
    <>
      <aside
        style={{
          width: "100%",
          maxWidth: "400px",
          boxSizing: "border-box",
          margin: "8px auto",
          display: "flex",
          flexDirection: "column",
          alignSelf: "center",
          borderRadius: 16,
          background: "rgba(15, 15, 20, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 215, 120, 0.2)",
          padding: "10px 14px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.6)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* 1. 상단: 정보 레이아웃 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                fontSize: 13,
                color: "#fff",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: 9, color: "#888", marginRight: 4 }}>현재 경지</span>
              <span style={{ color: "#ffd778" }}>{safeGame.faction}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>{safeGame.realm}</span>
            </div>

            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "2px 10px",
                fontSize: "12px",
                background: "linear-gradient(180deg, #f3c969, #d4a23c)",
                border: "none",
                borderRadius: "6px",
                color: "#1a1612",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 2px 6px rgba(212, 162, 60, 0.2)",
              }}
            >
              홈 🏠
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "4px 10px",
              fontSize: "10px",
              background: "linear-gradient(180deg, #f3c969, #d4a23c)",
              border: "none",
              borderRadius: "8px",
              color: "#1a1612",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 2px 6px rgba(212, 162, 60, 0.2)",
            }}
          >
            상태창 📜
          </button>
        </div>

        {/* 2. 게이지 영역 (HP/MP) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
                color: "#ff4d4d",
                marginBottom: "2px",
                fontWeight: "bold",
              }}
            >
              <span>HP</span>
              <span>
                {safeGame.hp.toLocaleString()} / {safeGame.maxHp.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
                border: "1px solid rgba(255,77,77,0.15)",
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #ff4d4d, #ff8c8c)",
                  transition: "width 0.4s ease-out",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
                color: "#55aaff",
                marginBottom: "2px",
                fontWeight: "bold",
              }}
            >
              <span>MP</span>
              <span>
                {safeGame.mp.toLocaleString()} / {safeGame.maxMp.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
                border: "1px solid rgba(85,170,255,0.15)",
              }}
            >
              <div
                style={{
                  width: `${mpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #55aaff, #8ccfff)",
                  transition: "width 0.4s ease-out",
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. 돌파 진행도 */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              color: "#aaa",
              marginBottom: "3px",
            }}
          >
            <span>{nextRealm ? `${nextRealm} 도달까지` : "최종 경지"}</span>
            <span style={{ color: "#ffd778" }}>{Math.floor(progressPercent)}%</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "3px",
              borderRadius: "1.5px",
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #f3c969, #d4a23c)",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        </div>

        {/* 4. 자금, 수련, 명성 데이터 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "4px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "6px 2px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "2px" }}>강호 명성</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ffcc00" }}>
              {safeGame.reputation.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "6px 2px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "2px" }}>보유 자금</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ffd778" }}>
              {safeGame.coins.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "6px 2px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "2px" }}>누적 수련</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#55ffaa" }}>
              {safeGame.touches.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "6px 2px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "2px" }}>총 공격력</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ff4d4d", textShadow: "0 0 4px rgba(255,77,77,0.3)" }}>
              {totalAttack.toLocaleString()}
            </div>
          </div>
        </div>


      </aside>

      <CharacterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}