
with open('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    line_num = i + 1
    if 2360 <= line_num <= 2520:
        if '<div' in line or '</div' in line:
            print(f"{line_num}: {line.strip()}")
