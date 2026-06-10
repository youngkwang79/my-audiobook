import os

ROOT_DIR = r"d:\소설 유투브\my-audiobook\my_audiobook"

FILES_TO_DELETE = [
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
    for f_rel in FILES_TO_DELETE:
        abs_path = os.path.join(ROOT_DIR, f_rel)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
                print(f"Deleted: {f_rel}")
            except Exception as e:
                print(f"Error deleting {f_rel}: {e}")
        else:
            print(f"File not found (already deleted): {f_rel}")

if __name__ == "__main__":
    main()
