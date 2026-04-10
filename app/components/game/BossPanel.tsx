"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import DamageText from "./elements/DamageText";

const BOSS_DATA = {
  name: "흑수선",
  realm: "일류고수",
  hp: 5000,
  maxHp: 5000,
  attack: 150,
  reward: { coins: 1000, exp: 5000, rep: 50 },
  imageIdle: "/boss/boss_idle.png",
  imageAttack: "/boss/boss_attack.png",
  imageHit: "/boss/boss_hit.png",
};

type EntityState = "idle" | "ready" | "attack" | "hit" | "win" | "lose";

export default function BossPanel() {
  const { game, winBoss, takeDamage } = useGameStore();
  const finalPlayerAttack = useGameStore((state) => state.getTotalAttack());

  const [bossHp, setBossHp] = useState(BOSS_DATA.hp);
  const [bossMaxHp, setBossMaxHp] = useState(BOSS_DATA.maxHp);
  const [turn, setTurn] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isFighting, setIsFighting] = useState(false);

  const [playerState, setPlayerState] = useState<EntityState>("idle");
  const [bossState, setBossState] = useState<EntityState>("idle");
  const [damages, setDamages] = useState<
    {
      id: number;
      damage: number;
      x: number;
      y: number;
      isCritical: boolean;
      target: "player" | "boss";
    }[]
  >([]);
  const [isShaking, setIsShaking] = useState({ player: false, boss: false });

  const spawnDamage = (
    value: number,
    critical: boolean,
    target: "player" | "boss"
  ) => {
    const id = Date.now() + Math.random();
    const x = target === "boss" ? 70 + Math.random() * 10 : 20 + Math.random() * 10;
    const y = 40 + Math.random() * 10;

    setDamages((prev) => [
      ...prev,
      { id, damage: value, x, y, isCritical: critical, target },
    ]);

    setTimeout(() => {
      setDamages((prev) => prev.filter((item) => item.id !== id));
    }, 800);
  };

  const triggerShake = (target: "player" | "boss") => {
    setIsShaking((prev) => ({ ...prev, [target]: true }));
    setTimeout(() => {
      setIsShaking((prev) => ({ ...prev, [target]: false }));
    }, 150);
  };

  const playerAttackTurn = () => {
    if (turn !== 1 || !isFighting) return;

    setPlayerState("ready");

    setTimeout(() => {
      setPlayerState("attack");

      const isCritical = Math.random() < 0.15;
      const damage = Math.floor(finalPlayerAttack * (isCritical ? 2.0 : 1.0));
      const newBossHp = Math.max(0, bossHp - damage);

      setBossHp(newBossHp);
      spawnDamage(damage, isCritical, "boss");
      triggerShake("boss");
      setBossState("hit");
      setTimeout(() => setBossState("idle"), 200);

      setBattleLog((prev) => [
        `⚔️ 나: ${BOSS_DATA.name}에게 ${damage}의 피해!`,
        ...prev,
      ]);

      if (newBossHp <= 0) {
        setTurn(3);
        setBossState("lose");
        setPlayerState("win");

        if (typeof winBoss === "function") {
          winBoss(BOSS_DATA.reward);
        }

        alert("🎉 승리! 보상을 획득했습니다.");
        setIsFighting(false);
      } else {
        setTurn(2);
        setTimeout(() => setPlayerState("idle"), 300);
      }
    }, 400);
  };

  useEffect(() => {
    if (turn === 2 && isFighting) {
      const timer = setTimeout(() => {
        setBossState("attack");

        const isCritical = Math.random() < 0.1;
        const damage = Math.floor(BOSS_DATA.attack * (isCritical ? 1.5 : 1.0));
        const newPlayerHp = Math.max(0, (game.hp ?? 100) - damage);

        if (typeof takeDamage === "function") {
          takeDamage(damage);
        }

        spawnDamage(damage, isCritical, "player");
        triggerShake("player");
        setPlayerState("hit");
        setTimeout(() => setPlayerState("idle"), 200);

        setBattleLog((prev) => [
          `🔥 ${BOSS_DATA.name}: 나에게 ${damage}의 피해!`,
          ...prev,
        ]);

        if (newPlayerHp <= 0) {
          setTurn(3);
          setPlayerState("lose");
          setBossState("win");
          alert("💀 패배했습니다...");
          setIsFighting(false);
        } else {
          setTurn(1);
          setTimeout(() => setBossState("idle"), 300);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [turn, isFighting, game.hp, takeDamage]);

  const startBattle = () => {
    setBossHp(BOSS_DATA.hp);
    setBossMaxHp(BOSS_DATA.maxHp);
    setBattleLog([`🚀 대결 시작! (공격력: ${finalPlayerAttack})`]);
    setTurn(1);
    setIsFighting(true);
    setPlayerState("idle");
    setBossState("idle");
  };

  const getMotionStyle = (
    state: EntityState,
    target: "player" | "boss"
  ): React.CSSProperties => {
    const isPlayer = target === "player";
    const shake = isShaking[target]
      ? isPlayer
        ? "translateX(-5px)"
        : "translateX(5px)"
      : "translateX(0px)";

    switch (state) {
      case "attack":
        return {
          transform: `${shake} ${isPlayer ? "translateX(30px)" : "translateX(-30px)"}`,
          transition: "transform 0.1s",
        };
      case "hit":
        return {
          transform: `${shake}`,
          filter: "brightness(1.5) contrast(1.2) hue-rotate(-50deg)",
        };
      case "lose":
        return {
          transform: "translateY(20px) rotate(10deg)",
          opacity: 0.5,
          transition: "all 0.5s",
        };
      default:
        return {
          transform: `${shake}`,
          transition: "transform 0.2s",
        };
    }
  };

  const playerHp = game.hp ?? 100;
  const playerMaxHp = game.maxHp ?? 100;
  const playerMp = game.mp ?? 300;
  const playerMaxMp = game.maxMp ?? 300;

  return (
    <div
      style={{
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "15px",
          background: "rgba(0,0,0,0.5)",
          borderRadius: "15px",
          border: "1px solid #444",
        }}
      >
        <h3 style={{ color: "#ff4d4d", margin: 0 }}>
          {BOSS_DATA.name} ({BOSS_DATA.realm})
        </h3>

        {turn === 0 && (
          <button
            onClick={startBattle}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "#b30000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ⚔️ 대결 시작
          </button>
        )}

        {isFighting && (
          <div
            style={{
              color: turn === 1 ? "#55ffaa" : "#ffcc00",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            {turn === 1 ? "● 나의 턴" : "● 보스의 턴"}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          height: "360px",
          background: "#111 url('/bg-boss.jpg') center/cover",
          borderRadius: "20px",
          border: "2px solid #555",
          overflow: "hidden",
        }}
      >
        {damages.map((dmg) => (
          <DamageText key={dmg.id} {...dmg} />
        ))}

        {/* 플레이어 */}
        <div
          style={{
            position: "absolute",
            left: "8%",
            bottom: "35px",
            textAlign: "center",
            width: "160px",
            ...getMotionStyle(playerState, "player"),
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "4px",
              textShadow: "1px 1px 2px #000",
            }}
          >
            생명력 {playerHp.toLocaleString()} / {playerMaxHp.toLocaleString()}
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#333",
              borderRadius: "4px",
              marginBottom: "6px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #55ffaa, #1fd67a)",
              }}
            />
          </div>

          <div
            style={{
              color: "#8ecbff",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "4px",
              textShadow: "1px 1px 2px #000",
            }}
          >
            내공 {playerMp.toLocaleString()} / {playerMaxMp.toLocaleString()}
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#333",
              borderRadius: "4px",
              marginBottom: "8px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, (playerMp / playerMaxMp) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #4da6ff, #7a5cff)",
              }}
            />
          </div>

          <img src="/warrior/idle.png" alt="나" style={{ width: "100px" }} />
        </div>

        {/* 보스 */}
        <div
          style={{
            position: "absolute",
            right: "8%",
            bottom: "35px",
            textAlign: "center",
            width: "180px",
            ...getMotionStyle(bossState, "boss"),
          }}
        >
          <div
            style={{
              color: "#ffb3b3",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "4px",
              textShadow: "1px 1px 2px #000",
            }}
          >
            생명력 {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}
          </div>
          <div
            style={{
              width: "100%",
              height: "10px",
              background: "#333",
              borderRadius: "5px",
              marginBottom: "8px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ff4d4d, #ff8080)",
              }}
            />
          </div>

          <img
            src={
              bossState === "attack"
                ? BOSS_DATA.imageAttack
                : bossState === "hit"
                ? BOSS_DATA.imageHit
                : BOSS_DATA.imageIdle
            }
            alt="보스"
            style={{ width: "140px" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) parent.innerHTML += "<div style='font-size:80px'>👹</div>";
            }}
          />
        </div>

        {turn === 1 && isFighting && (
          <button
            onClick={playerAttackTurn}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              padding: "20px",
              borderRadius: "50%",
              background: "rgba(85,255,170,0.8)",
              border: "none",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "18px",
              boxShadow: "0 0 20px #55ffaa",
            }}
          >
            공격!
          </button>
        )}
      </div>

      <div
        style={{
          height: "110px",
          background: "rgba(0,0,0,0.7)",
          borderRadius: "10px",
          padding: "10px",
          overflowY: "auto",
          fontSize: "12px",
        }}
      >
        {battleLog.map((log, i) => (
          <div
            key={i}
            style={{ color: log.includes("⚔️") ? "#55ffaa" : "#ff9c9c" }}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}