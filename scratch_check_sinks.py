import os
import sys
import datetime

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

def scan_path(name, path):
    if os.path.exists(path):
        size = get_dir_size(path)
        size_gb = size / (1024 * 1024 * 1024)
        size_mb = size / (1024 * 1024)
        print(f"{name:<40} : {size_gb:8.3f} GB ({size_mb:8.2f} MB) - {path}")
    else:
        print(f"{name:<40} : Not Found - {path}")

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    user_profile = os.environ.get("USERPROFILE", "C:\\Users\\owner")
    local_appdata = os.environ.get("LOCALAPPDATA", os.path.join(user_profile, "AppData", "Local"))
    appdata = os.environ.get("APPDATA", os.path.join(user_profile, "AppData", "Roaming"))
    temp_dir = os.environ.get("TEMP", os.path.join(local_appdata, "Temp"))

    paths_to_check = [
        ("Playwright Browsers (ms-playwright)", os.path.join(local_appdata, "ms-playwright")),
        ("Temp Directory", temp_dir),
        ("Pip Cache", os.path.join(local_appdata, "pip", "Cache")),
        ("Npm Cache", os.path.join(appdata, "npm-cache")),
        ("Yarn Cache", os.path.join(local_appdata, "Yarn", "Cache")),
        ("HuggingFace Cache", os.path.join(user_profile, ".cache", "huggingface")),
        ("Chrome User Data", os.path.join(local_appdata, "Google", "Chrome", "User Data")),
        ("Selenium / WebDrivers", os.path.join(user_profile, ".wdm")), # Webdriver manager
        ("Brave User Data", os.path.join(local_appdata, "BraveSoftware", "Brave-Browser", "User Data")),
    ]

    print("=== Scanning Common Cache/Temp Folders on C: ===")
    for name, path in paths_to_check:
        scan_path(name, path)

    # Let's find large files (e.g. > 100MB) created or modified in the last 7 days under C:\Users\owner\AppData
    print("\n=== Large files (>50MB) modified in the last 7 days under AppData or Temp ===")
    large_files = []
    now = datetime.datetime.now()
    dirs_to_search = [local_appdata, appdata]
    
    for base_d in dirs_to_search:
        if not os.path.exists(base_d):
            continue
        try:
            for root, dirs, files in os.walk(base_d):
                # To prevent scanning forever or getting permissions issues, skip certain system directories if possible
                # But we want to find temp/cache files.
                # Let's filter out some typical noisy dirs that don't change or we can't write to
                if "Microsoft\\Windows" in root or "Packages" in root:
                    continue
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        mtime = os.path.getmtime(fp)
                        mod_time = datetime.datetime.fromtimestamp(mtime)
                        if (now - mod_time).days <= 7:
                            size = os.path.getsize(fp)
                            if size > 50 * 1024 * 1024:  # > 50MB
                                large_files.append((fp, size, mod_time))
                    except OSError:
                        pass
        except Exception as e:
            print(f"Error scanning AppData: {e}")

    large_files.sort(key=lambda x: x[1], reverse=True)
    for fp, size, mod_time in large_files[:30]:
        size_mb = size / (1024 * 1024)
        print(f"  {size_mb:8.2f} MB | {mod_time.strftime('%Y-%m-%d %H:%M')} | {fp}")

if __name__ == "__main__":
    main()
