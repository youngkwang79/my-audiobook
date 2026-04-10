"use client";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";

/**
 * [밸런스 설정] 
 * 각 경지별 기본 스탯입니다. 문파의 스타일에 따라 여기서 보너스가 붙습니다.
 */
const REALM_BASE_STATS: Record<string, { multiplier: number; crit: number; price: number }> = {
  "필부": { multiplier: 3, crit: 1, price: 100 },
  "삼류": { multiplier: 4, crit: 3, price: 1000 },
  "이류": { multiplier: 5, crit: 5, price: 5000 },
  "일류": { multiplier: 6, crit: 8, price: 20000 },
  "절정": { multiplier: 7, crit: 12, price: 100000 },
  "초절정": { multiplier: 8, crit: 18, price: 500000 },
  "화경": { multiplier: 9, crit: 25, price: 2000000 },
  "현경": { multiplier: 10, crit: 35, price: 10000000 },
  "생사경": { multiplier: 15, crit: 50, price: 50000000 },
  "신화경": { multiplier: 20, crit: 70, price: 200000000 },
  "천인합일": { multiplier: 30, crit: 90, price: 1000000000 },
};

// 경지 순서 (잠금 해제 확인용)
const REALM_ORDER = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];

export default function LibraryPanel() {
  const { game, learnSkill } = useGameStore();

  // 1. 유저가 선택한 문파 정보 가져오기
  const userFaction = FACTIONS.find(f => f.name === game.faction);
  
  if (!userFaction) return <div>문파를 먼저 선택해주세요.</div>;

  // 2. 문파의 모든 무공(martial)을 서각 상품으로 변환
  const factionSkillList = Object.entries(userFaction.martial).map(([realm, data]) => {
    const base = REALM_BASE_STATS[realm];
    
    // [옵션 보정] 문파 스타일별 특화
    let finalMulti = base.multiplier;
    let finalCrit = base.crit;
    
    // 무공 배수 보정 (폭딜/파괴력은 위력 1배수 추가)
    if (userFaction.style === "폭딜" || userFaction.style === "파괴력") finalMulti += 1;
    if (userFaction.style === "카운터" || userFaction.style === "반격") finalCrit += 5;
    if (userFaction.style === "정통 검기") { finalCrit += 2; }

    return {
      name: data.name,
      realm: realm,
      innerPower: data.innerPower,
      price: base.price,
      atk: 0, // 구버전 호환성을 위해 0으로 남김
      multiplier: finalMulti,
      crit: finalCrit,
      style: userFaction.style
    };
  });

  const handleLearn = (skill: any) => {
    if (game.coins < skill.price) return alert("전금이 부족합니다!");
    learnSkill(skill);
  };

  return (
    <div style={{ padding: "10px", color: "#eee" }}>
      <header style={{ textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ color: userFaction.theme.accent, fontSize: "20px", marginBottom: "5px" }}>
          {game.faction} 장경각
        </h2>
        <p style={{ fontSize: "12px", color: "#aaa" }}>{userFaction.summary}</p>
      </header>

      <div
        style={{
          display: "grid",
          gap: "8px",
          maxHeight: "450px",
          overflowY: "auto",
          paddingRight: "6px",
        }}
      >
        {factionSkillList.map((skill) => {
          // 상태 체크
          const isLearned = game.learnedSkills.some(s => s.name === skill.name);
          const currentRealmIndex = REALM_ORDER.indexOf(game.realm);
          const skillRealmIndex = REALM_ORDER.indexOf(skill.realm);
          const isLocked = skillRealmIndex > currentRealmIndex; // 유저 경지보다 높으면 잠금

          return (
            <div key={skill.name} style={{
              background: isLocked ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isLearned ? "#444" : isLocked ? "#222" : userFaction.theme.accent + "44"}`,
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: isLocked ? 0.5 : 1,
              filter: isLocked ? "grayscale(1)" : "none"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", color: userFaction.theme.accent, border: `1px solid ${userFaction.theme.accent}`, padding: "1px 4px", borderRadius: "3px" }}>
                    {skill.realm}
                  </span>
                  <strong style={{ fontSize: "15px" }}>{skill.name}</strong>
                </div>
                <div style={{ fontSize: "12px", color: "#bbb", marginTop: "5px" }}>
                  발동 위력 <span style={{ color: "#ff8888" }}>총공격력의 {skill.multiplier}배</span> | 
                  치명타율 보너스 <span style={{ color: "#88ff88" }}>{skill.crit}%</span>
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>필요 내공: {skill.innerPower}</div>
              </div>

              <button
                disabled={isLearned || isLocked}
                onClick={() => handleLearn(skill)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isLearned ? "#333" : isLocked ? "#111" : userFaction.theme.accent,
                  color: isLearned ? "#666" : isLocked ? "#444" : "#000",
                  fontWeight: "bold",
                  cursor: (isLearned || isLocked) ? "default" : "pointer",
                  fontSize: "12px",
                  minWidth: "80px"
                }}
              >
                {isLearned ? "습득완료" : isLocked ? "잠김" : `${skill.price.toLocaleString()}냥`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}