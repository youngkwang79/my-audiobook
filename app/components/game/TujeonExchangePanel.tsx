"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { GIRU_GIFT_ITEMS } from "@/app/lib/game/nightSystem";

const EXCHANGE_ITEMS = [
  {
    id: "gilu_gift",
    icon: "🎁",
    name: "월향루 선물함",
    grade: "일반",
    cost: 5,
    limit: 5,
    desc: "기루 NPC 호감도 상승용 무작위 선물을 얻습니다.",
    rewardText: "무작위 선물 +1",
  },
  {
    id: "moon_buff",
    icon: "🌙",
    name: "월향 버프권",
    grade: "고급",
    cost: 10,
    limit: 3,
    desc: "다음 낮 금화와 심득 획득량이 증가합니다.",
    rewardText: "월향 버프 적용",
  },
  {
    id: "stone_box",
    icon: "🪨",
    name: "현철 강화석 상자",
    grade: "고급",
    cost: 20,
    limit: 3,
    desc: "장비 강화에 필요한 현철 강화석을 얻습니다.",
    rewardText: "현철 강화석 +30",
  },
  {
    id: "rare_box",
    icon: "🧧",
    name: "흑시 희귀품 상자",
    grade: "희귀",
    cost: 30,
    limit: 2,
    desc: "흑시에서 흘러나온 희귀 아이템을 얻습니다.",
    rewardText: "희귀 아이템 +1",
  },
  {
    id: "gear_piece",
    icon: "⚔️",
    name: "야행 장비 조각",
    grade: "영웅",
    cost: 50,
    limit: 2,
    desc: "고급 장비 제작에 필요한 조각을 얻습니다.",
    rewardText: "장비 조각 +5",
  },
];

const UNLOCK_ITEMS = [
  {
    id: "secret_gamble",
    icon: "🎲",
    name: "비밀 도박장",
    cost: 10,
    desc: "야바위와 고급 판돈 테이블이 열립니다.",
  },
  {
    id: "black_market",
    icon: "🕯️",
    name: "흑시 상인",
    cost: 30,
    desc: "희귀 재료와 특수 장비 조각 상점이 열립니다.",
  },
  {
    id: "night_boss",
    icon: "👹",
    name: "밤의 보스 퀘스트",
    cost: 50,
    desc: "새벽 정산 후 특수 보스 퀘스트가 해금됩니다.",
  },
];

function getTujeon(game: any) {
  return game.gamblingTokens ?? game.tujeonTokens ?? game.gambleTokens ?? 0;
}

function gradeColor(grade: string) {
  if (grade === "영웅") return "#ff6bd6";
  if (grade === "희귀") return "#b58cff";
  if (grade === "고급") return "#6ad7ff";
  return "#ffd36a";
}

export default function TujeonExchangePanel() {
  const game = useGameStore((s: any) => s.game);

  const tujeon = getTujeon(game);
  const bought = game.tujeonExchangeBought ?? {};
  const unlocked = game.unlockedContents ?? [];

  const spendTujeon = (game: any, cost: number) => {
    const current = getTujeon(game);

    return {
      ...game,
      gamblingTokens: current - cost,
      tujeonTokens:
        game.tujeonTokens !== undefined ? current - cost : game.tujeonTokens,
      gambleTokens:
        game.gambleTokens !== undefined ? current - cost : game.gambleTokens,
    };
  };

  const buyItem = (item: any) => {
    const boughtCount = bought[item.id] ?? 0;

    if (boughtCount >= item.limit) {
      alert("오늘은 더 이상 교환할 수 없습니다.");
      return;
    }

    if (tujeon < item.cost) {
      alert("투전패가 부족합니다.");
      return;
    }

    useGameStore.setState((s: any) => {
      const baseGame = spendTujeon(s.game, item.cost);

      const nextGame: any = {
        ...baseGame,
        tujeonExchangeBought: {
          ...(s.game.tujeonExchangeBought ?? {}),
          [item.id]: (s.game.tujeonExchangeBought?.[item.id] ?? 0) + 1,
        },
      };
 
      if (item.id === "gilu_gift") {
        const gifts = GIRU_GIFT_ITEMS;
        const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
        const nextGifts = { ...(s.game.giruGifts || {}) };
        nextGifts[randomGift.id] = (nextGifts[randomGift.id] || 0) + 1;
        nextGame.giruGifts = nextGifts;
        // 알림은 밖에서 처리하거나 여기서 nextGame에 메시지 담기 힘드니 alert 사용
        setTimeout(() => alert(`선물함에서 [${randomGift.icon} ${randomGift.name}]을(를) 얻었습니다!`), 100);
      }

      if (item.id === "moon_buff") {
        nextGame.buffTickets = (s.game.buffTickets ?? 0) + 1;
        nextGame.activeBuffs = [
          ...(s.game.activeBuffs ?? []),
          {
            id: `moon_buff_${Date.now()}`,
            name: "월향 버프",
            desc: "다음 낮 금화와 심득 획득량이 10% 증가합니다.",
            type: "day_reward",
            value: 0.1,
            duration: 1,
          },
        ];
      }

      if (item.id === "stone_box") {
        nextGame.enhancementStones = (s.game.enhancementStones ?? 0) + 30;
      }

      if (item.id === "rare_box") {
        nextGame.rareItems = (s.game.rareItems ?? 0) + 1;
        nextGame.inventory = [
          ...(s.game.inventory ?? []),
          {
            id: `rare_item_${Date.now()}`,
            name: "흑시 희귀품",
            type: "rare",
            desc: "투전패 교환소에서 얻은 희귀 아이템입니다.",
          },
        ];
      }

      if (item.id === "gear_piece") {
        nextGame.gearPieces = (s.game.gearPieces ?? 0) + 5;
      }

      return { game: nextGame };
    });

    alert(`${item.name} 교환 완료!\n${item.rewardText}`);
  };

  const unlockContent = (item: any) => {
    if (unlocked.includes(item.id)) {
      alert("이미 해금된 콘텐츠입니다.");
      return;
    }

    if (tujeon < item.cost) {
      alert("투전패가 부족합니다.");
      return;
    }

    useGameStore.setState((s: any) => {
      const baseGame = spendTujeon(s.game, item.cost);

      return {
        game: {
          ...baseGame,
          unlockedContents: [...(s.game.unlockedContents ?? []), item.id],
        },
      };
    });

    alert(`${item.name} 해금 완료!`);
  };

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "18px",
        borderRadius: "22px",
        background:
          "radial-gradient(circle at top, rgba(98,52,140,0.5), rgba(12,8,20,0.98) 55%)",
        border: "1px solid rgba(255,215,120,0.22)",
        boxShadow: "0 0 24px rgba(0,0,0,0.45)",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: "-40px",
          top: "-40px",
          width: "120px",
          height: "120px",
          borderRadius: "999px",
          background: "rgba(255,211,106,0.08)",
          filter: "blur(8px)",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "22px", fontWeight: 950 }}>
              🎴 투전패 교환소
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#bdb3c9",
                marginTop: "4px",
                lineHeight: 1.5,
              }}
            >
              밤의 승부에서 얻은 투전패를 보상과 해금권으로 바꿉니다.
            </div>
          </div>

          <div
            style={{
              padding: "9px 12px",
              borderRadius: "14px",
              background: "rgba(255,211,106,0.12)",
              border: "1px solid rgba(255,211,106,0.28)",
              textAlign: "right",
              minWidth: "96px",
            }}
          >
            <div style={{ fontSize: "10px", color: "#c8b98a" }}>
              보유 투전패
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 950,
                color: "#ffd36a",
              }}
            >
              {tujeon.toLocaleString()}개
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: "12px",
            color: "#d8d0df",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          추천 순서: <b>비밀 도박장 해금</b> → <b>강화석 상자</b> →{" "}
          <b>장비 조각</b>
        </div>

        <div style={sectionTitleStyle}>교환 보상</div>

        <div style={{ display: "grid", gap: "10px" }}>
          {EXCHANGE_ITEMS.map((item) => {
            const boughtCount = bought[item.id] ?? 0;
            const soldOut = boughtCount >= item.limit;
            const lack = tujeon < item.cost;
            const disabled = soldOut || lack;

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: disabled ? 1 : 1.012 }}
                whileTap={{ scale: disabled ? 1 : 0.985 }}
                style={{
                  padding: "13px",
                  borderRadius: "17px",
                  background: disabled
                    ? "rgba(255,255,255,0.035)"
                    : "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
                  border: disabled
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(255,255,255,0.14)",
                  opacity: disabled ? 0.58 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={itemIconStyle}>{item.icon}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 950, fontSize: "14px" }}>
                        {item.name}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "999px",
                          color: gradeColor(item.grade),
                          border: `1px solid ${gradeColor(item.grade)}55`,
                          background: `${gradeColor(item.grade)}18`,
                        }}
                      >
                        {item.grade}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginTop: "4px",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.desc}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#777",
                        marginTop: "5px",
                      }}
                    >
                      오늘 교환 {boughtCount}/{item.limit}
                    </div>
                  </div>

                  <button
                    onClick={() => buyItem(item)}
                    disabled={disabled}
                    style={{
                      padding: "9px 10px",
                      borderRadius: "12px",
                      border: "none",
                      background: soldOut
                        ? "#333"
                        : lack
                        ? "#2a2a2a"
                        : "linear-gradient(180deg, #ffe08a, #d69a2d)",
                      color: disabled ? "#777" : "#201203",
                      fontWeight: 950,
                      fontSize: "12px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {soldOut ? "매진" : `${item.cost}개`}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ ...sectionTitleStyle, marginTop: "20px" }}>
          영구 해금
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {UNLOCK_ITEMS.map((item) => {
            const isUnlocked = unlocked.includes(item.id);
            const lack = tujeon < item.cost;
            const disabled = isUnlocked || lack;

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: disabled ? 1 : 1.012 }}
                whileTap={{ scale: disabled ? 1 : 0.985 }}
                style={{
                  padding: "13px",
                  borderRadius: "17px",
                  background: isUnlocked
                    ? "rgba(80,255,150,0.09)"
                    : "linear-gradient(135deg, rgba(152,96,255,0.14), rgba(255,255,255,0.04))",
                  border: isUnlocked
                    ? "1px solid rgba(80,255,150,0.35)"
                    : "1px solid rgba(197,140,255,0.18)",
                  opacity: disabled && !isUnlocked ? 0.58 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={itemIconStyle}>{item.icon}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 950, fontSize: "14px" }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginTop: "4px",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>

                  <button
                    onClick={() => unlockContent(item)}
                    disabled={disabled}
                    style={{
                      padding: "9px 10px",
                      borderRadius: "12px",
                      border: "none",
                      background: isUnlocked
                        ? "#2ecc71"
                        : lack
                        ? "#2a2a2a"
                        : "linear-gradient(180deg, #d9a7ff, #8c55ff)",
                      color: lack && !isUnlocked ? "#777" : "#fff",
                      fontWeight: 950,
                      fontSize: "12px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isUnlocked ? "해금됨" : `${item.cost}개`}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "#8f8799",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          ※ 교환 보상은 하루 제한이 있고, 영구 해금은 한 번만 구매됩니다.
          <br />
          ※ 투전패는 홀짝, 주사위, 야바위 승리와 연승 보너스로 획득합니다.
        </div>
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  marginBottom: "10px",
  fontSize: "15px",
};

const itemIconStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.08)",
};