import os
import sys

def get_dir_size(path):
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    try:
                        total_size += os.path.getsize(fp)
                    except OSError:
                        pass
    except Exception as e:
        pass
    return total_size

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    user_profile = os.environ.get("USERPROFILE", "C:\\Users\\owner")
    local_appdata = os.environ.get("LOCALAPPDATA", os.path.join(user_profile, "AppData", "Local"))
    appdata = os.environ.get("APPDATA", os.path.join(user_profile, "AppData", "Roaming"))

    video_dirs = [
        ("CapCut (Local)", os.path.join(local_appdata, "CapCut")),
        ("Vrew (Roaming)", os.path.join(appdata, "vrew")),
        ("Vrew Updater (Local)", os.path.join(local_appdata, "vrew-updater")),
    ]

    print("=== Video Editing Softwares Disk Usage on C: ===")
    for name, path in video_dirs:
        if os.path.exists(path):
            size = get_dir_size(path)
            size_gb = size / (1024 * 1024 * 1024)
            size_mb = size / (1024 * 1024)
            print(f"{name:<25} : {size_gb:8.3f} GB ({size_mb:8.2f} MB) - {path}")
        else:
            print(f"{name:<25} : Not Found")

if __name__ == "__main__":
    main()
