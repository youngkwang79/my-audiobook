import os

ROOT_DIR = r"d:\소설 유투브\my-audiobook\my_audiobook"
DEPRECATED_MD_PATH = os.path.join(ROOT_DIR, "deprecated.md")

FILES_TO_BACKUP = [
    r"app\components\Header.tsx",
    r"app\components\game\elements\Dummy.tsx",
    r"app\components\game\factions.ts",
    r"app\components\game\storage.ts",
    r"app\components\work\WorkCard.tsx",
    r"app\lib\_game_types.ts",
    r"app\lib\game\martialBooks.ts",
    r"app\lib\game\shop.ts",
    r"app\lib\game\unlocks.ts",
    r"app\lib\payment.ts",
    r"lib\supabaseAdmin.ts"
]

def main():
    backup_content = []
    backup_content.append("# Deprecated Code Backup\n")
    backup_content.append("This file contains the complete backup of unused files and components before they were deleted during the dead code cleanup.\n\n")

    for f_rel in FILES_TO_BACKUP:
        abs_path = os.path.join(ROOT_DIR, f_rel)
        if os.path.exists(abs_path):
            try:
                with open(abs_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Determine language for markdown code blocks
                lang = "typescript" if f_rel.endswith((".ts", ".tsx")) else "javascript" if f_rel.endswith((".js", ".jsx")) else "css" if f_rel.endswith(".css") else ""
                
                backup_content.append(f"## File: {f_rel.replace('\\', '/')}\n")
                backup_content.append(f"```{lang}\n")
                backup_content.append(content)
                if not content.endswith("\n"):
                    backup_content.append("\n")
                backup_content.append("```\n\n")
                print(f"Backed up: {f_rel}")
            except Exception as e:
                print(f"Error backing up {f_rel}: {e}")
        else:
            print(f"File not found (already deleted or wrong path): {f_rel}")

    with open(DEPRECATED_MD_PATH, "w", encoding="utf-8") as out_f:
        out_f.writelines(backup_content)
    
    print(f"Successfully wrote backup to {DEPRECATED_MD_PATH}")

if __name__ == "__main__":
    main()
