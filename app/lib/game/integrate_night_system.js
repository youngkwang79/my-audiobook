
const fs = require('fs');
const path = require('path');
const filePath = path.join('d:', '소설 유투브', 'my-audiobook', 'my_audiobook', 'app', 'lib', 'game', 'useGameStore.ts');

if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Imports
if (!content.includes('import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS } from "./nightSystem";')) {
    content = content.replace('import { FACTIONS } from "./factions";', 'import { FACTIONS } from "./factions";\nimport { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS } from "./nightSystem";');
}

// 2. Update GameState Interface
if (!content.includes('visitGiru: () => void;')) {
    content = content.replace('triggerCombatTrap: (multiplier: number) => void;', 'triggerCombatTrap: (multiplier: number) => void;\n  visitGiru: () => void;\n  interactGiru: (npcId: string, actionId: string) => { success: boolean; message: string; event?: any };');
}

// 3. Update getTotalAttack with nightAtkMult
const nightAtkLogic = `    let nightAtkMult = 1;
    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "atk_up_10") nightAtkMult += 0.1;
        if (b.effect === "atk_up_20") nightAtkMult += 0.2;
      });
    }`;

if (!content.includes('let nightAtkMult = 1;')) {
    content = content.replace('const optionAtkFlat = get().getOptionSum("atk");', 'const optionAtkFlat = get().getOptionSum("atk");\n\n' + nightAtkLogic);
    // Find where final is calculated and add nightAtkMult
    content = content.replace('moveAtkMult * setAtkBonus;', 'moveAtkMult * setAtkBonus * nightAtkMult;');
}

// 4. Update addExp with night gold/exp/touch buffs
if (!content.includes('let nightExpMult = 1;')) {
    const nightExpLogic = `    let nightExpMult = 1;
    let nightGoldMult = 1;
    let nightTouchMult = 1;
    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "exp_gain_up_10") nightExpMult += 0.1;
        if (b.effect === "gold_gain_up_10") nightGoldMult += 0.1;
        if (b.effect === "touch_eff_up_10") nightTouchMult += 0.1;
      });
    }
`;
    content = content.replace('const finalGoldB = goldB * (1 + innBonus.gold);', 'const finalGoldB = goldB * (1 + innBonus.gold) * nightGoldMult;');
    content = content.replace('const finalExp = amount *', nightExpLogic + '\n    const finalExp = amount * nightExpMult *');
    content = content.replace('const nTouches = s.game.touches + (1 +', 'const nTouches = s.game.touches + (nightTouchMult +');
}

// 5. Add Giru methods at the end
if (!content.includes('visitGiru: () => {')) {
    const giruMethods = `
  visitGiru: () => {
    set((s: any) => ({ game: { ...s.game, activeTab: "giru" } }));
  },
  interactGiru: (npcId: string, actionId: string) => {
    const { game } = get();
    const action = GIRU_ACTIONS.find(a => a.id === actionId);
    if (!action) return { success: false, message: "잘못된 요청입니다." };
    if (game.coins < action.cost) return { success: false, message: "금전이 부족합니다." };

    const npcEvents = GIRU_EVENTS.filter(e => e.npcId === npcId && e.action === actionId);
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const possibleEvents = npcEvents.filter(e => !e.condition || (favor >= (e.condition.favorMin || 0)));
    
    if (possibleEvents.length === 0) {
        set((s: any) => {
            const nextFavors = { ...s.game.npcFavors };
            nextFavors[npcId] = (nextFavors[npcId] || 0) + (action.favor || 0);
            return {
                game: {
                    ...s.game,
                    coins: s.game.coins - action.cost,
                    npcFavors: nextFavors
                }
            };
        });
        get().triggerSave(true);
        return { success: true, message: "대화를 나눴습니다." };
    }
    
    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
    
    set((s: any) => {
      const nextFavors = { ...s.game.npcFavors };
      nextFavors[npcId] = (nextFavors[npcId] || 0) + (event.result.favor || action.favor || 0);
      
      const nextBuffs = [...(s.game.nightBuffs || [])];
      if (event.result.buff) {
        nextBuffs.push({
          id: event.id,
          name: event.effect,
          effect: event.result.buff,
          expiresAt: Date.now() + 30 * 60 * 1000
        });
      }
      
      return {
        game: {
          ...s.game,
          coins: s.game.coins - action.cost,
          npcFavors: nextFavors,
          nightBuffs: nextBuffs,
          gamblingTokens: (s.game.gamblingTokens || 0) + (event.result.token || 0),
        }
      };
    });
    
    get().triggerSave(true);
    return { success: true, message: event.text, event };
  },`;

    const lastBraceIndex = content.lastIndexOf('}));');
    if (lastBraceIndex !== -1) {
        content = content.slice(0, lastBraceIndex) + giruMethods + '\n' + content.slice(lastBraceIndex);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Night System integration applied successfully');
