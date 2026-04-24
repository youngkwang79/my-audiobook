
$path = "useGameStore.ts"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$lines = [System.IO.File]::ReadAllLines($path, $utf8)

# Re-add imports (Double check if they are already there)
if ($lines[4] -notlike "*GIRU_NPCS*") {
    # If imports are missing, let's fix them too.
    # But from view_file they seem to be there.
}

# REALM_SETTINGS fix (Line 31 to 41 are indices 30 to 40)
$lines[30] = "  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: 'straw', label: '객잔 짚더미', hp: 150, mp: 60, goldMultiplier: 1 },"
$lines[31] = "  삼류: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: 'straw', label: '말라비틀어진 짚더미', hp: 300, mp: 150, goldMultiplier: 3 },"
$lines[32] = "  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: 'wood', label: '참나무 목인', hp: 600, mp: 350, goldMultiplier: 8 },"
$lines[33] = "  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: 'leather', label: '가죽 목인', hp: 1200, mp: 700, goldMultiplier: 20 },"
$lines[34] = "  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: 'iron', label: '청강철 목인', hp: 2500, mp: 1500, goldMultiplier: 50 },"
$lines[35] = "  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: 'spirit', label: '기운 서린 목인', hp: 5000, mp: 3000, goldMultiplier: 150 },"
$lines[36] = "  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: 'master', label: '화경의 환영', hp: 12000, mp: 7000, goldMultiplier: 400 },"
$lines[37] = "  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: 'legend', label: '현경의 전설', hp: 25000, mp: 15000, goldMultiplier: 1000 },"
$lines[38] = "  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: 'life-death', label: '생사의 문턱', hp: 50000, mp: 35000, goldMultiplier: 2500 },"
$lines[39] = "  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: 'myth', label: '신화의 형상', hp: 120000, mp: 80000, goldMultiplier: 7000 },"
$lines[40] = "  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: 'heaven', label: '천인합일의 경지', hp: 300000, mp: 200000, goldMultiplier: 20000 },"

# REALM_ORDER fix (Line 76, which is index 75)
$lines[75] = "export const REALM_ORDER = ['필부', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경', '생사경', '신화경', '천인합일'];"

[System.IO.File]::WriteAllLines($path, $lines, $utf8)
