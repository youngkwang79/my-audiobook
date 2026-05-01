import os

path = r'd:\소설 유투브\my-audiobook\my_audiobook\app\components\game\TutorialOverlay.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Adjust the 'top' property for target selection steps
# Move select_item_to_refine, select_item_to_reroll, select_item_to_infuse to 75%

# We'll rewrite the 'top' logic block
new_lines = lines[:184]

new_top = [
    '            top:\n',
    '              [\n',
    '                "select_item_to_refine",\n',
    '                "select_item_to_reroll",\n',
    '                "select_item_to_infuse",\n',
    '              ].includes(step.id)\n',
    '                ? "75%"\n', # Target selection: Bottom
    '                : [\n',
    '                    "click_refine_start",\n',
    '                    "click_reroll_start",\n',
    '                    "goto_forge_refine",\n',
    '                  ].includes(step.id)\n',
    '                    ? "38%"\n', # Start buttons: Top
    '                    : step.id === "select_refine_tab"\n',
    '                      ? "32%"\n',
    '                      : step.id === "select_item_inventory"\n',
    '                        ? "68%"\n',
    '                        : ["check_quest", "explain_mission_bar"].includes(step.id)\n',
    '                          ? "35%"\n',
    '                          : [\n',
    '                              "click_status_detailed",\n',
    '                              "explain_status_panel",\n',
    '                              "explain_time_cycle",\n',
    '                              "explain_auto_battle",\n',
    '                              "auto_training_info",\n',
    '                            ].includes(step.id)\n',
    '                            ? "28%"\n',
    '                            : step.id === "explain_night_only"\n',
    '                              ? "55%"\n',
    '                              : "50%",\n'
]

# Skip old top logic (up to transform around line 210)
# Let's find where 'transform:' starts in the original file
transform_idx = -1
for i, line in enumerate(lines):
    if 'transform:' in line and i > 184:
        transform_idx = i
        break

if transform_idx != -1:
    new_lines.extend(new_top)
    new_lines.extend(lines[transform_idx:])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated popup positions for target selection steps")
