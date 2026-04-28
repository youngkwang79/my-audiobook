const fs = require('fs');
const filePath = 'app/components/game/GiruPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Adding state
content = content.replace(
  /const \[showSecretRoom, setShowSecretRoom\] = useState\(false\);/,
  `const [showSecretRoom, setShowSecretRoom] = useState(false);
  const [showSeolmaeBuffModal, setShowSeolmaeBuffModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);`
);

// We need to fetch the investment bonus and costs correctly.
// Let's add a helper function inside GiruPanel.tsx to get the cost dynamically.
content = content.replace(
  /const handleAction = async/,
  `
  const getDynamicCost = (baseCost: number) => {
    if (!game) return baseCost;
    const { getFavorDiscount, getGiruInvestmentBonus } = require('@/app/lib/game/nightSystem');
    const invBonus = getGiruInvestmentBonus(game.giruLevel || 1);
    let cost = baseCost;
    if (invBonus.costDiscount > 0) cost = Math.floor(cost * (1 - invBonus.costDiscount));
    cost = Math.floor(cost * getFavorDiscount(favor));
    return cost;
  };

  const handleAction = async`
);

// Update cost rendering
content = content.replace(
  /💰 \{action\.cost\.toLocaleString\(\)\}/g,
  `💰 {action.id !== "gift" ? getDynamicCost(action.cost).toLocaleString() : 0}`
);

// Update condition rendering for cost
content = content.replace(
  /game\.coins >= action\.cost/g,
  `game.coins >= (action.id !== "gift" ? getDynamicCost(action.cost) : 0)`
);

// Update action handlers for the new NPCs
const actionHandlerLogic = `
    if (actionId === "info" && npcId === "yeonhwa") {
      if (game.nightLimits?.infoTradeUsed) {
        alert("오늘의 정보 거래는 이미 완료되었습니다.");
        setIsProcessing(false); return;
      }
      setShowInfoTradeModal(true); setIsProcessing(false); return;
    }
    
    // Custom button triggers (not standard actions but let's add them via buttons)
`;

content = content.replace(
  /if \(actionId === "info"\) \{[^]*?if \(npcId === "yeonhwa"\) \{[^]*?return;\s*\}/,
  actionHandlerLogic
);

// Let's add custom NPC action buttons right below GIRU_ACTIONS
const customButtons = `
                {/* NPC 전용 특수 기능 버튼 */}
                {selectedNpc.id === "seolmae" && favor >= 40 && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowSeolmaeBuffModal(true)}
                    style={{ padding: "10px 16px", borderRadius: "14px", background: "linear-gradient(135deg, #1e3c72, #2a5298)", color: "#fff", border: "1px solid #4facfe", fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                  >
                    <span>🌸 설매의 축복 (버프 선택)</span>
                    <span>무료</span>
                  </motion.button>
                )}
                
                {selectedNpc.id === "hongryeon" && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowInvestmentModal(true)}
                    style={{ padding: "10px 16px", borderRadius: "14px", background: "linear-gradient(135deg, #8e2de2, #4a00e0)", color: "#fff", border: "1px solid #c39bd3", fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                  >
                    <span>💎 월향루 투자 (기루 레벨업)</span>
                    <span>Lv.{game.giruLevel || 1}</span>
                  </motion.button>
                )}
`;

content = content.replace(
  /\{GIRU_ACTIONS\.map\(action => \(/,
  `${customButtons}\n                {GIRU_ACTIONS.map(action => (`
);


// Modals Injection
const modalsLogic = `
      {/* 홍련 투자 모달 */}
      <AnimatePresence>
        {showInvestmentModal && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "#1a1a2e", padding: "20px", borderRadius: "16px", width: "80%", border: "2px solid #8e2de2" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#ffd700" }}>월향루 투자</h3>
              <p style={{ fontSize: "12px", color: "#ccc" }}>기루에 투자하여 모든 서비스 비용을 줄이고 혜택을 늘리세요.</p>
              
              <div style={{ margin: "15px 0", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <div>현재 레벨: {game.giruLevel || 1}</div>
                <div>누적 투자: {(game.giruInvestment || 0).toLocaleString()} 금화</div>
                {game.giruLevel < 10 ? (
                  <div style={{ marginTop: "10px", color: "#4facfe" }}>
                    다음 레벨 필요 금액: {(() => {
                       const { GIRU_INVEST_COSTS } = require('@/app/lib/game/nightSystem');
                       return GIRU_INVEST_COSTS[game.giruLevel || 1].toLocaleString();
                    })()} 금화
                  </div>
                ) : (
                  <div style={{ marginTop: "10px", color: "#4dff8a" }}>최대 레벨 도달!</div>
                )}
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => {
                  const { GIRU_INVEST_COSTS } = require('@/app/lib/game/nightSystem');
                  const nextCost = GIRU_INVEST_COSTS[game.giruLevel || 1];
                  if (game.giruLevel >= 10) { alert("이미 최대 레벨입니다."); return; }
                  if (game.coins < nextCost) { alert("금화가 부족합니다."); return; }
                  useGameStore.setState((s: any) => ({
                    game: { ...s.game, coins: s.game.coins - nextCost, giruLevel: (s.game.giruLevel || 1) + 1, giruInvestment: (s.game.giruInvestment || 0) + nextCost }
                  }));
                  useGameStore.getState().triggerSave(true);
                  alert("투자가 완료되었습니다! 기루 레벨이 상승했습니다.");
                }} style={{ flex: 1, padding: "10px", background: "#8e2de2", border: "none", color: "#fff", borderRadius: "8px" }}>투자하기</button>
                <button onClick={() => setShowInvestmentModal(false)} style={{ flex: 1, padding: "10px", background: "#555", border: "none", color: "#fff", borderRadius: "8px" }}>닫기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 설매 버프 모달 */}
      <AnimatePresence>
        {showSeolmaeBuffModal && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "#1a1a2e", padding: "20px", borderRadius: "16px", width: "80%", border: "2px solid #4facfe" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#4facfe" }}>설매의 축복</h3>
              <p style={{ fontSize: "12px", color: "#ccc" }}>다음날 전투를 위한 버프를 1개 선택하세요.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                {(() => {
                  const { SEOLMAE_BUFFS } = require('@/app/lib/game/nightSystem');
                  return SEOLMAE_BUFFS.map((buff: any) => (
                    <button key={buff.id} onClick={() => {
                       const value = Math.floor(Math.random() * (buff.max - buff.min) + buff.min);
                       useGameStore.setState((s: any) => ({
                         game: { ...s.game, nightBuffs: [...(s.game.nightBuffs || []), { id: buff.id, name: \`\${buff.name} +\${value}\${buff.suffix}\` }] }
                       }));
                       alert(\`\${buff.name} +\${value}\${buff.suffix} 버프를 받았습니다!\`);
                       setShowSeolmaeBuffModal(false);
                    }} style={{ padding: "10px", background: "rgba(79,172,254,0.1)", border: "1px solid #4facfe", color: "#fff", borderRadius: "8px", textAlign: "left" }}>
                      {buff.name} ( {buff.min}{buff.suffix} ~ {buff.max}{buff.suffix} )
                    </button>
                  ));
                })()}
              </div>
              <button onClick={() => setShowSeolmaeBuffModal(false)} style={{ width: "100%", padding: "10px", background: "#555", border: "none", color: "#fff", borderRadius: "8px", marginTop: "15px" }}>닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 정보 거래 모달 교체 */}
      <AnimatePresence>
        {showInfoTradeModal && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "#1a1a2e", padding: "20px", borderRadius: "16px", width: "80%", border: "2px solid #e0c3fc" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#e0c3fc" }}>비밀 정보 거래</h3>
              <p style={{ fontSize: "12px", color: "#ccc" }}>어떤 정보를 원하시나요?</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                {["low", "mid", "high", "special"].map(tier => {
                  if (tier === "special" && favor < 60) return null; // 특급은 60이상
                  const label = tier === "low" ? "하급 정보" : tier === "mid" ? "중급 정보" : tier === "high" ? "고급 정보" : "특급 정보";
                  const { INFO_TIER_CONFIG, REALM_BONUS_CONFIG, getFavorDiscount } = require('@/app/lib/game/nightSystem');
                  const conf = INFO_TIER_CONFIG[tier];
                  const rBonus = REALM_BONUS_CONFIG[game.realm || "필부"] || { priceMult: 1 };
                  const cost = Math.floor(conf.basePrice * rBonus.priceMult * getFavorDiscount(favor));
                  
                  return (
                    <button key={tier} onClick={() => {
                      const res = interactGiru("yeonhwa", "info", { infoTier: tier });
                      if(res.success) { setDialogue(res.message); setShowInfoTradeModal(false); }
                      else { alert(res.message); }
                    }} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(224,195,252,0.1)", border: "1px solid #e0c3fc", color: "#fff", borderRadius: "8px" }}>
                      <span>{label}</span>
                      <span style={{ color: "#ffd700" }}>💰 {cost.toLocaleString()}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setShowInfoTradeModal(false)} style={{ width: "100%", padding: "10px", background: "#555", border: "none", color: "#fff", borderRadius: "8px", marginTop: "15px" }}>닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

content = content.replace(
  /\{showInfoTradeModal && \([\s\S]*?\}\s*<\/AnimatePresence>/,
  modalsLogic
);

fs.writeFileSync(filePath, content);
console.log('GiruPanel UI updated');
