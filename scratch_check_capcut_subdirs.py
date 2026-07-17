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
    capcut_path = r"C:\Users\owner\AppData\Local\CapCut\User Data"
    if not os.path.exists(capcut_path):
        print("CapCut User Data folder not found.")
        return

    print("=== CapCut User Data Subdirectory Sizes ===")
    for entry in os.scandir(capcut_path):
        if entry.is_dir():
            size = get_dir_size(entry.path)
            size_gb = size / (1024 * 1024 * 1024)
            size_mb = size / (1024 * 1024)
            print(f"{entry.name:<25} : {size_gb:8.3f} GB ({size_mb:8.2f} MB)")

if __name__ == "__main__":
    main()
