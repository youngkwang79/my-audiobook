import os

path = r'd:\소설 유투브\my-audiobook\my_audiobook\app\components\game\TutorialOverlay.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Update the style object for the instruction card
# Replacing lines from left: (around 180) to border: (around 211)

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
    '                ? "38%"\n', # Slightly lowered from 35%
    '                : step.id === "select_refine_tab"\n',
    '                  ? "32%"\n',
    '                  : step.id === "select_item_inventory"\n',
    '                    ? "68%"\n', # Slightly raised from 70%
    '                    : ["check_quest", "explain_mission_bar"].includes(step.id)\n',
    '                      ? "35%"\n',
    '                      : [\n',
    '                          "click_status_detailed",\n',
    '                          "explain_status_panel",\n',
    '                          "explain_time_cycle",\n',
    '                          "explain_auto_battle",\n',
    '                          "auto_training_info",\n',
    '                        ].includes(step.id)\n',
    '                        ? "28%"\n', # Raised from 23% to prevent top clipping
    '                        : step.id === "explain_night_only"\n',
    '                          ? "55%"\n',
    '                          : "50%",\n',
    '            transform: "translate(-50%, -50%)",\n',
    '            width: "90%",\n',
    '            maxWidth: "320px",\n',
    '            maxHeight: "80vh",\n',
    '            overflowY: "auto",\n',
    '            boxSizing: "border-box",\n'
]

# We skip until line 211 in original file (where 'border:' was)
new_lines.extend(new_style)
new_lines.extend(lines[211:])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully applied strict mobile safety styles to TutorialOverlay.tsx")
