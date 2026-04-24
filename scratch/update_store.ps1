
$path = 'app\lib\game\useGameStore.ts'
$content = Get-Content $path | Out-String

if ($content) {
    # Tower HP Lowering
    $content = $content.Replace('const maxHp = 1650;', 'const maxHp = 650;')
    # Tower Atk Increasing
    $content = $content.Replace('let atk = 160;', 'let atk = 260;')
    # Tower Miss Penalty
    $content = $content.Replace('const missDmg = t.maxHp * 0.05;', 'const missDmg = t.maxHp * 0.1;')
    # Tower Damage Variance and Combo
    $targetDmg = 'let damage = Math.floor(atk * defenseMultiplier * (isCrit ? critDmg : 1)) + extraDmg;'
    $replaceDmg = 'const comboBonus = 1 + (nextCombo * 0.05); const variance = 0.9 + Math.random() * 0.2; let damage = Math.floor(atk * defenseMultiplier * (isCrit ? critDmg : 1) * comboBonus * variance) + extraDmg;'
    $content = $content.Replace($targetDmg, $replaceDmg)

    Set-Content $path $content
    Write-Host "Update completed successfully"
} else {
    Write-Host "Failed to read content"
}
