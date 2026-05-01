import os

path = r'd:\소설 유투브\my-audiobook\my_audiobook\app\components\game\TutorialOverlay.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Update the 'top' property for target selection steps from 75% to 70%

new_lines = []
for line in lines:
    if '"75%"' in line and 'Target selection: Bottom' in line:
        new_lines.append(line.replace('"75%"', '"70%"'))
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully moved target selection popups slightly up to 70%")
