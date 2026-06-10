import os

file_path = r"d:\소설 유투브\my-audiobook\my_audiobook\app\page.tsx"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        if "무공 수련" in line:
            print(f"{idx+1}: {line.strip()}")
except Exception as e:
    print("Error:", e)
