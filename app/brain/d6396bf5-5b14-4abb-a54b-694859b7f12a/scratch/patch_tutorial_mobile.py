import os

path = r'd:\소설 유투브\my-audiobook\my_audiobook\app\components\game\TutorialOverlay.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace the style object section for the instruction card
# Start from 'left:' (around line 180) to 'transform:' (around line 242)

new_lines = lines[:180]

new_style = [
    '            left: "50%",\n',
    '            top:\n',
    '              [\n',
    '                "select_item_to_refine",\n',
    '                "click_refine_start",\n',
    '                "select_item_to_reroll",\n',
    '                "click_reroll_start",\n',
    '                "select_item_to_infuse",\n',
    '                "goto_forge_refine",\n',
    '              ].includes(step.id)\n',
    '                ? "35%"\n', # Forge steps: move up
    '                : step.id === "select_refine_tab"\n',
    '                  ? "30%"\n',
    '                  : step.id === "select_item_inventory"\n',
    '                    ? "70%"\n', # Inventory selection: move down
    '                    : ["check_quest", "explain_mission_bar"].includes(step.id)\n',
    '                      ? "33%"\n',
    '                      : [\n',
    '                          "click_status_detailed",\n',
    '                          "explain_status_panel",\n',
    '                          "explain_time_cycle",\n',
    '                          "explain_auto_battle",\n',
    '                          "auto_training_info",\n',
    '                        ].includes(step.id)\n',
    '                        ? "23%"\n',
    '                        : step.id === "explain_night_only"\n',
    '                          ? "55%"\n',
    '                          : "50%",\n',
    '            transform: "translate(-50%, -50%)",\n',
    '            width: "min(320px, 90%)",\n'
]

# Find where the old width was (around line 243)
# We want to skip lines from 180 to 243

new_lines.extend(new_style)
new_lines.extend(lines[244:])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated TutorialOverlay.tsx for mobile responsiveness")
