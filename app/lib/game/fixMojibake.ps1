
$path = "useGameStore.ts"
$content = [System.IO.File]::ReadAllText($path)

# Re-add imports
if ($content -notlike "*from './nightSystem'*") {
    $target = "import { defaultGameData, loadGame, saveGame } from './storage';"
    $replacement = "import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS } from './nightSystem';`nimport { defaultGameData, loadGame, saveGame } from './storage';"
    $content = $content.Replace($target, $replacement)
}

# Fix Realm Settings and other broken strings
# Using specific strings to avoid wrong replacements
$content = $content.Replace("?꾨?: { bonus: 1.0", "필부: { bonus: 1.0")
$content = $content.Replace("?쇰쪟: { bonus: 1.0", "삼류: { bonus: 1.0")
$content = $content.Replace("?대쪟: { bonus: 1.5", "이류: { bonus: 1.5")
$content = $content.Replace("?쇰쪟: { bonus: 2.5", "일류: { bonus: 2.5")
$content = $content.Replace("?덉젙: { bonus: 4.5", "절정: { bonus: 4.5")
$content = $content.Replace("珥덉젅?? { bonus: 8.0", "초절정: { bonus: 8.0")
$content = $content.Replace("?붽꼍: { bonus: 15.0", "화경: { bonus: 15.0")
$content = $content.Replace("?꾧꼍: { bonus: 40.0", "현경: { bonus: 40.0")
$content = $content.Replace("?앹궗寃?: { bonus: 100.0", "생사경: { bonus: 100.0")
$content = $content.Replace("?좏솕寃?: { bonus: 300.0", "신화경: { bonus: 300.0")
$content = $content.Replace("泥쒖씤?⑹씪: { bonus: 1000.0", "천인합일: { bonus: 1000.0")

$content = $content.Replace('"?꾨?"', '"필부"')
$content = $content.Replace('"?쇰쪟"', '"삼류"') # This might be risky if it's used for both
$content = $content.Replace('"?대쪟"', '"이류"')
$content = $content.Replace('"珥덉젅??"', '"초절정"')
$content = $content.Replace('"?붽꼍"', '"화경"')
$content = $content.Replace('"?꾧꼍"', '"현경"')
$content = $content.Replace('"?앹궗寃?"', '"생사경"')
$content = $content.Replace('"?좏솕寃?"', '"신화경"')
$content = $content.Replace('"泥쒖씤?⑹씪"', '"천인합일"')

# Fix other UI strings
$content = $content.Replace("?≪? 吏싲뜑誘?", "객잔 짚더미")
$content = $content.Replace("裏싲뜑誘?", "짚더미")
$content = $content.Replace("留먮씪鍮꾪??댁쭊", "말라비틀어진")
$content = $content.Replace("?듬굹臾?", "참나무")
$content = $content.Replace("紐⑹씤", "목인")
$content = $content.Replace("媛€二?", "가죽")
$content = $content.Replace("紐⑷꺽??", "목격자") # Wait, 목경인? No, it's usually 목인.
$content = $content.Replace("泥?컯泥?", "청강철")
$content = $content.Replace("湲곗슫 ?쒕┛", "기운 서린")
$content = $content.Replace("?붽꼍???섏쁺", "화경의 환영")
$content = $content.Replace("?꾧꼍???꾩꽕", "현경의 전설")
$content = $content.Replace("?앹궗??臾명꽦", "생사의 문턱")
$content = $content.Replace("?좏솕???뺤긽", "신화의 형상")

# Fix STAT_UPGRADE_CONFIG
$content = $content.Replace("?앸챸??", "생명력")
$content = $content.Replace("?닿났", "내공")
$content = $content.Replace("怨듦꺽??", "공격력")
$content = $content.Replace("諛⑹뼱??", "방어력")
$content = $content.Replace("移섎챸?€ ?뺣쪧", "치명타 확률")
$content = $content.Replace("移섎챸?€ ?쇳빐", "치명타 피해")
$content = $content.Replace("?뚰뵾??", "회피율")
$content = $content.Replace("湲곗슫/?됱슫", "기운/행운")
$content = $content.Replace("?섎젴 ?⑥쑉", "수련 효율")
$content = $content.Replace("?섎젴 ?쒓컙", "수련 시간")

# Save as UTF-8 without BOM
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
