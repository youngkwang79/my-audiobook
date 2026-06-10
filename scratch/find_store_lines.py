import os

file_path = r"d:\소설 유투브\my-audiobook\my_audiobook\app\lib\game\useGameStore.ts"

targets = [
    "STAT_INCREMENTS",
    "TOWER_BUFF_POOL",
    "TOWER_ARTIFACT_POOL",
    "TOWER_THEMES",
    "generateTowerBuffs",
    "generateTowerArtifacts",
    "generateTowerEnemy",
    "generateTowerWave",
    "STAT_UPGRADE_BASES",
    "getRealmSettings",
    "getBatteryInterval"
]

try:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    for idx, line in enumerate(lines):
        for t in targets:
            if f"export" in line and t in line:
                print(f"Line {idx+1}: {line.strip()}")
except Exception as e:
    print("Error:", e)
