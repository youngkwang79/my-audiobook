import os

path = r'd:\소설 유투브\my-audiobook\my_audiobook\app\components\game\TutorialOverlay.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The problematic block is around lines 180-230
# 1-indexed lines 180 to 203 are the messy 'left' part
# 1-indexed lines 204 to 230 are the 'top' part

new_lines = lines[:179] # Before line 180 (0-indexed 179)

new_left = [
    '            left:\n',
    '              [\n',
    '                "select_item_to_refine",\n',
    '                "select_item_to_reroll",\n',
    '                "select_item_to_infuse",\n',
    '                "goto_forge_refine",\n',
    '                "select_refine_tab",\n',
    '              ].includes(step.id)\n',
    '                ? "24%"\n',
    '                : step.id === "click_equip_button"\n',
    '                  ? "55%"\n',
    '                  : "50%",\n'
]

new_top = [
    '            top:\n',
    '              [\n',
    '                "select_item_to_refine",\n',
    '                "click_refine_start",\n',
    '                "select_item_to_reroll",\n',
    '                "click_reroll_start",\n',
    '                "select_item_to_infuse",\n',
    '                "goto_forge_refine",\n',
    '              ].includes(step.id)\n',
    '                ? "40%"\n',
    '                : step.id === "select_refine_tab"\n',
    '                  ? "35%"\n',
    '                  : step.id === "select_item_inventory"\n',
    '                    ? "65%"\n',
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
    '                          : "50%",\n'
]

new_lines.extend(new_left)
new_lines.extend(new_top)
new_lines.extend(lines[230:]) # After line 230

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully patched TutorialOverlay.tsx")
