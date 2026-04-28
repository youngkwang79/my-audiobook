const fs = require('fs');
const filePath = 'app/lib/game/items.ts';
let content = fs.readFileSync(filePath, 'utf8');

const realms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
const attackBase = [10, 30, 80, 250, 800, 2500, 8000, 20000, 50000, 120000, 300000];
const critEvasionBase = [1, 2, 3, 5, 8, 12, 16, 20, 25, 30, 35];
const defMultiplier = [0.1, 0.15, 0.25, 0.4, 0.6, 0.9, 1.3, 1.8, 2.5, 3.5, 5.0];
const prices = [5000, 20000, 80000, 300000, 1200000, 5000000, 20000000, 80000000, 300000000, 1200000000, 5000000000];

const newItems = [];

for(let i=0; i<realms.length; i++) {
  const r = realms[i];
  const atk = attackBase[i];
  const crit = critEvasionBase[i];
  const eva = critEvasionBase[i];
  const def = Math.floor(atk * defMultiplier[i]);
  const hp = atk * 2;
  const mp = atk;
  const price = prices[i];
  
  newItems.push(`  {
    id: "${r}_mainWeapon",
    name: "${r} 무기",
    slot: "mainWeapon",
    realm: "${r}",
    attackBonus: ${atk},
    price: ${price},
    icon: "⚔️",
    description: "공격 +${atk}"
  }`);
  
  newItems.push(`  {
    id: "${r}_subWeapon",
    name: "${r} 보조무기",
    slot: "subWeapon",
    realm: "${r}",
    attackBonus: ${Math.floor(atk*0.6)},
    price: ${Math.floor(price*0.6)},
    icon: "🗡️",
    description: "공격 +${Math.floor(atk*0.6)}"
  }`);
  
  newItems.push(`  {
    id: "${r}_gloves",
    name: "${r} 장갑",
    slot: "gloves",
    realm: "${r}",
    critBonus: ${crit},
    price: ${price},
    icon: "🧤",
    description: "치명타 +${crit}%"
  }`);
  
  newItems.push(`  {
    id: "${r}_shoes",
    name: "${r} 신발",
    slot: "shoes",
    realm: "${r}",
    evadeBonus: ${eva},
    price: ${price},
    icon: "👢",
    description: "회피 +${eva}%"
  }`);
  
  newItems.push(`  {
    id: "${r}_robe",
    name: "${r} 도포",
    slot: "robe",
    realm: "${r}",
    defenseBonus: ${def},
    price: ${price},
    icon: "🥋",
    description: "방어 +${def}"
  }`);
  
  newItems.push(`  {
    id: "${r}_necklace",
    name: "${r} 목걸이",
    slot: "necklace",
    realm: "${r}",
    mpBonus: ${mp},
    price: ${price},
    icon: "📿",
    description: "내공 +${mp}"
  }`);
  
  newItems.push(`  {
    id: "${r}_bracelet",
    name: "${r} 팔찌",
    slot: "bracelet",
    realm: "${r}",
    hpBonus: ${hp},
    price: ${price},
    icon: "🧿",
    description: "생명 +${hp}"
  }`);
  
  newItems.push(`  {
    id: "${r}_ring",
    name: "${r} 반지",
    slot: "ring",
    realm: "${r}",
    price: ${price},
    icon: "💍",
    description: "특수 옵션 부여"
  }`);
}

const newItemStr = `export const FORGE_ITEMS: OwnedWeapon[] = [\n${newItems.join(',\n')}\n];`;
const startIndex = content.indexOf('export const FORGE_ITEMS');
const endIndex = content.indexOf('export const RANDOM_OPTION_POOL');

content = content.slice(0, startIndex) + newItemStr + '\n\n' + content.slice(endIndex);
fs.writeFileSync(filePath, content);
console.log('Done!');
