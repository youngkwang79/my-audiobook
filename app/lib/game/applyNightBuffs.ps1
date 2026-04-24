
$path = "useGameStore.ts"
$content = Get-Content $path -Raw

# Update getTotalAttack to include night buffs
if ($content -like "*let moveAtkMult = 1;*") {
    $nightAtkLogic = @"
    let nightAtkMult = 1;
    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "atk_up_10") nightAtkMult += 0.1;
        if (b.effect === "atk_up_20") nightAtkMult += 0.2;
      });
    }
"@
    $content = $content.Replace("let moveAtkMult = 1;", $nightAtkLogic + "`n    let moveAtkMult = 1;")
    $content = $content.Replace("return (gearAtk + upgradeAtk + optionAtkFlat + innBonus.atk) * realmMult * moveAtkMult * (1 + optionAtkPct / 100);", "return (gearAtk + upgradeAtk + optionAtkFlat + innBonus.atk) * realmMult * moveAtkMult * nightAtkMult * (1 + optionAtkPct / 100);")
}

# Update addCoins to include night buffs
if ($content -like "*addCoins: (amount: number) => {*") {
    $nightGoldLogic = @"
  addCoins: (amount: number) => { 
    let finalAmount = amount;
    if (amount > 0) {
      const { game } = get();
      if (game.nightBuffs) {
        game.nightBuffs.forEach((b: any) => {
          if (b.effect === "gold_gain_up_10") finalAmount *= 1.1;
          if (b.effect === "gold_gain_up_20") finalAmount *= 1.2;
        });
      }
    }
    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + Math.floor(finalAmount) } }));
"@
    $content = $content.Replace("addCoins: (amount: number) => { `n    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + amount } }));", $nightGoldLogic)
    # Fix if spacing is different
    $content = $content.Replace("addCoins: (amount: number) => {`n    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + amount } }));", $nightGoldLogic)
}

# Update updateTime to clear expired night buffs
if ($content -like "*updateTime: (dt: number) => {*") {
    $clearBuffsLogic = @"
  updateTime: (dt: number) => {
    const now = Date.now();
    set((s: any) => {
      const nextBuffs = (s.game.nightBuffs || []).filter((b: any) => b.expiresAt > now);
      return { game: { ...s.game, nightBuffs: nextBuffs } };
    });
"@
    $content = $content.Replace("updateTime: (dt: number) => {", $clearBuffsLogic)
}

Set-Content $path $content
