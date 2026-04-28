const fs = require('fs');
const filePath = 'app/lib/game/useGameStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add new Giru Actions to GameStore interface
if (!content.includes('executeGiruAction:')) {
  content = content.replace(
    /interface GameStore \{/,
    `interface GameStore {
  executeGiruAction: (npcId: string, actionType: string, giftId?: string, infoTier?: string) => void;
  investGiru: () => void;
  getGiruNpcFavor: (npcId: string) => number;
  getGiruActionCost: (baseCost: number) => number;
  getGiruInfoReward: (baseMin: number, baseMax: number, npcId: string, tierKey: string) => number;
`
  );

  // Append new actions inside the create block
  const giruLogic = `

  getGiruNpcFavor: (npcId: string) => {
    return get().game.npcFavor?.[npcId] || 0;
  },

  getGiruActionCost: (baseCost: number) => {
    const s = get();
    const gLevel = s.game.giruLevel || 1;
    // Investment discount
    const costMult1 = gLevel >= 3 ? 0.95 : 1.0;
    return Math.floor(baseCost * costMult1);
  },

  getGiruInfoReward: (baseMin: number, baseMax: number, npcId: string, tierKey: string) => {
    const s = get();
    // Logic moved to GiruPanel or handled locally
    return baseMax; // placeholder
  },

  investGiru: () => {
    const s = get();
    const currentLevel = s.game.giruLevel || 1;
    if (currentLevel >= 10) return;
    
    // Dynamically require nightSystem constants later
    const cost = 0; // Handled in UI
    s.triggerSave(true);
  },

  executeGiruAction: (npcId: string, actionType: string, giftId?: string, infoTier?: string) => {
    const s = get();
    // Real logic to be implemented in GiruPanel mostly
    s.triggerSave(true);
  },
`;

  content = content.replace(
    /triggerSave: \(immediate\?:\s*boolean\)\s*=>\s*\{/,
    `${giruLogic}\n  triggerSave: (immediate?: boolean) => {`
  );
  
  // Replace action limit setting in updateTime
  content = content.replace(
    /giluActionLeft: 5,/,
    `giluActionLeft: 3 + (s.game.giruLevel >= 5 ? 1 : 0),`
  );

  fs.writeFileSync(filePath, content);
  console.log('useGameStore.ts updated for Giru logic placeholders');
}
