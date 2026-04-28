const fs = require('fs');
const filePath = 'app/components/game/GiruPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Ensure correct imports at the top
if (!content.includes('GIRU_INVEST_COSTS')) {
  content = content.replace(
    /import \{ GIRU_NPCS, GIRU_ACTIONS, GiruNPC, GiruEvent, GIRU_GIFT_ITEMS, GIRU_QUESTS \} from "@\/app\/lib\/game\/nightSystem";/,
    `import { GIRU_NPCS, GIRU_ACTIONS, GiruNPC, GiruEvent, GIRU_GIFT_ITEMS, GIRU_QUESTS, GIRU_INVEST_COSTS, SEOLMAE_BUFFS, INFO_TIER_CONFIG, REALM_BONUS_CONFIG, getFavorDiscount, getGiruInvestmentBonus } from "@/app/lib/game/nightSystem";`
  );
}

// Remove the inline requires
content = content.replace(/const \{.*?\} = require\('@\/app\/lib\/game\/nightSystem'\);/g, '');

fs.writeFileSync(filePath, content);
console.log('Fixed requires in GiruPanel.tsx');
