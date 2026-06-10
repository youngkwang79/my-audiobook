import os

files = [
    r"app\components\BottomNav.tsx",
    r"app\components\TopBar.tsx",
    r"app\components\LayoutFooter.tsx",
    r"app\components\Header.tsx"
]

for f in files:
    path = os.path.join(r"d:\소설 유투브\my-audiobook\my_audiobook", f)
    if os.path.exists(path):
        print(f"=== {f} ===")
        try:
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
            for line_idx, line in enumerate(content.splitlines()):
                if any(x in line for x in ["game", "Game", "무공", "수련"]):
                    print(f"  Line {line_idx+1}: {line.strip()}")
        except Exception as e:
            print(f"  Error: {e}")
