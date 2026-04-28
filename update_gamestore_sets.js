const fs = require('fs');
const filePath = 'app/lib/game/useGameStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace SYNERGY_CONFIG usages in getTotalAttack
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn\) \{[\s\S]*?if \(count >= 3[\s\S]*?if \(count >= 5[\s\S]*?\}[\s\S]*?\}\);/, 
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn) {
        if (count >= 2 && syn[2]?.atkMult) setAtkBonus *= (1 + syn[2].atkMult);
      }
    });`);

content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 5 && syn\[5\]\?\.finalDmg\) final \*= \(1 \+ syn\[5\]\.finalDmg\);[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn && count >= 6 && syn[6]?.finalDmg) final *= (1 + syn[6].finalDmg);
    });`);

// Replace in getTotalCritRate
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const realmSet = REALM_SET_OPTIONS\[setName\];[\s\S]*?if \(realmSet && count >= realmSet\.requiredPieces\) setCrit \+= \(realmSet\.critRateBonus \|\| 0\);[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn\) \{[\s\S]*?if \(count >= 3 && syn\[3\]\?\.critRate\) setCrit \+= syn\[3\]\.critRate;[\s\S]*?if \(count >= 5 && syn\[5\]\?\.allStat\) setCrit \+= 5;[\s\S]*?\}[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn && count >= 4 && syn[4]?.critRate) setCrit += syn[4].critRate;
    });`);

// Replace in getTotalCritDmg
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 3 && syn\[3\]\?\.critDmg\) setBonus \+= syn\[3\]\.critDmg;[\s\S]*?\}\);/,
`// Crit Dmg is not in the new synergy sets, so we just clear this loop or adapt it if needed
    Object.entries(setCounts).forEach(([fullSetName, count]) => {
      // reserved for future
    });`);

// Replace in getTotalDefense
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 5 && syn\[5\]\?\.allStat\) setDefMult \*= \(1 \+ syn\[5\]\.allStat\);[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn && count >= 2 && syn[2]?.defMult) setDefMult *= (1 + syn[2].defMult);
    });`);

// Replace in getTotalHp
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 5 && syn\[5\]\?\.allStat\) setHpMult \*= \(1 \+ syn\[5\]\.allStat\);[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      // HP max multiplier is not in the new sets, but regen is
    });`);

// Replace in getTotalEvasion
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 5 && syn\[5\]\?\.allStat\) eva \+= 5;[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn && count >= 2 && syn[2]?.eva) eva += syn[2].eva;
    });`);

// Replace in getTotalMp
content = content.replace(/Object\.entries\(setCounts\)\.forEach\(\(\[setName, count\]\) => \{[\s\S]*?const syn = SYNERGY_CONFIG\[setName\];[\s\S]*?if \(syn && count >= 5 && syn\[5\]\?\.allStat\) setMpMult \*= \(1 \+ syn\[5\]\.allStat\);[\s\S]*?\}\);/,
`Object.entries(setCounts).forEach(([fullSetName, count]) => {
      const setType = fullSetName.split('_')[1];
      const syn = SYNERGY_CONFIG[setType];
      if (syn && count >= 2 && syn[2]?.mpMult) setMpMult *= (1 + syn[2].mpMult);
    });`);

// Update getSetCounts logic to use setName as is, since setName is now realm_type
content = content.replace(/getSetCounts: \(\) => \{[\s\S]*?counts\[item\.setName\] = \(counts\[item\.setName\] \|\| 0\) \+ 1;[\s\S]*?\} else if \(item\?\.realm\) \{[\s\S]*?counts\[item\.realm\] = \(counts\[item\.realm\] \|\| 0\) \+ 1;[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?return counts;[\s\S]*?\},/,
`getSetCounts: () => {
    const { game } = get();
    const counts: Record<string, number> = {};
    if (!game.equippedGear) return counts;
    Object.values(game.equippedGear).forEach(id => {
      if (!id) return;
      const item = game.ownedWeapons.find(w => w.id === id);
      if (item?.setName) {
        counts[item.setName] = (counts[item.setName] || 0) + 1;
      }
    });
    return counts;
  },`);

fs.writeFileSync(filePath, content);
console.log('useGameStore updated!');
