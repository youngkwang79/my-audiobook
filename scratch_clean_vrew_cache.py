import os
import shutil
import sys

def delete_path(path):
    deleted_size = 0
    if not os.path.exists(path):
        return 0
    
    if os.path.isfile(path) or os.path.islink(path):
        try:
            size = os.path.getsize(path)
            os.remove(path)
            deleted_size += size
        except Exception as e:
            print(f"Error removing file {path}: {e}")
    elif os.path.isdir(path):
        for root, dirs, files in os.walk(path, topdown=False):
            for name in files:
                fp = os.path.join(root, name)
                try:
                    size = os.path.getsize(fp)
                    os.remove(fp)
                    deleted_size += size
                except Exception as e:
                    pass
            for name in dirs:
                dp = os.path.join(root, name)
                try:
                    os.rmdir(dp)
                except Exception as e:
                    pass
        try:
            os.rmdir(path)
        except Exception as e:
            pass
    return deleted_size

def clean_vrew():
    user_profile = os.environ.get("USERPROFILE", "C:\\Users\\owner")
    vrew_roaming = os.path.join(user_profile, "AppData", "Roaming", "vrew")
    vrew_updater = os.path.join(user_profile, "AppData", "Local", "vrew-updater")
    
    total_saved = 0

    print("=== Starting Vrew Cache & Temp Cleanup ===")

    # 1. Clean vrew-updater
    if os.path.exists(vrew_updater):
        print(f"Cleaning vrew-updater: {vrew_updater}")
        saved = delete_path(vrew_updater)
        total_saved += saved
        print(f"-> Saved: {saved / (1024*1024):.2f} MB")
    
    # 2. Clean vrew Cache folder contents (but keep the folder)
    vrew_cache = os.path.join(vrew_roaming, "Cache")
    if os.path.exists(vrew_cache):
        print(f"Cleaning vrew Cache directory contents: {vrew_cache}")
        saved = 0
        for entry in os.scandir(vrew_cache):
            saved += delete_path(entry.path)
        total_saved += saved
        print(f"-> Saved: {saved / (1024*1024):.2f} MB")

    # 3. Clean older vrew autosave_backups (keep the 3 most recent backups)
    vrew_backup = os.path.join(vrew_roaming, "autosave_backup")
    if os.path.exists(vrew_backup):
        print(f"Cleaning older vrew backups in: {vrew_backup}")
        try:
            backups = []
            for f in os.listdir(vrew_backup):
                fp = os.path.join(vrew_backup, f)
                if os.path.isfile(fp) and f.endswith(".vrew"):
                    backups.append((fp, os.path.getmtime(fp), os.path.getsize(fp)))
            
            # Sort by modification time (oldest first)
            backups.sort(key=lambda x: x[1])
            
            # Keep the 3 most recent backups
            to_delete = backups[:-3] if len(backups) > 3 else []
            
            saved = 0
            for fp, mtime, size in to_delete:
                try:
                    os.remove(fp)
                    saved += size
                except Exception as e:
                    print(f"Error deleting old backup {fp}: {e}")
            total_saved += saved
            print(f"-> Saved: {saved / (1024*1024):.2f} MB (kept the 3 most recent backups)")
        except Exception as e:
            print(f"Error cleaning backups: {e}")

    print(f"\n=== Cleanup Finished! Total Space Saved: {total_saved / (1024*1024):.2f} MB ===")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    clean_vrew()
