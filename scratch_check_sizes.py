import os
import sys

def get_dir_size(path):
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                # skip if it is a symbolic link
                if not os.path.islink(fp):
                    try:
                        total_size += os.path.getsize(fp)
                    except OSError:
                        pass
    except Exception as e:
        print(f"Error walking {path}: {e}")
    return total_size

def main():
    base_dir = r"C:\Users\owner\.gemini\antigravity"
    if not os.path.exists(base_dir):
        print(f"Directory {base_dir} does not exist.")
        return

    print("=== Scanning C:\\Users\\owner\\.gemini\\antigravity ===")
    items = []
    try:
        for entry in os.scandir(base_dir):
            if entry.is_dir():
                size = get_dir_size(entry.path)
                items.append((entry.name, size, entry.path))
            else:
                try:
                    size = entry.stat().st_size
                    items.append((entry.name, size, entry.path))
                except OSError:
                    pass
    except Exception as e:
        print(f"Error scanning base dir: {e}")

    items.sort(key=lambda x: x[1], reverse=True)
    for name, size, path in items:
        size_mb = size / (1024 * 1024)
        size_gb = size / (1024 * 1024 * 1024)
        print(f"{name:<25} : {size_gb:8.3f} GB ({size_mb:8.2f} MB)")

    # Let's inspect the brain directory in more detail since it's likely the largest
    brain_dir = os.path.join(base_dir, "brain")
    if os.path.exists(brain_dir):
        print("\n=== Scanning C:\\Users\\owner\\.gemini\\antigravity\\brain subdirectories ===")
        brain_items = []
        try:
            for entry in os.scandir(brain_dir):
                if entry.is_dir():
                    size = get_dir_size(entry.path)
                    brain_items.append((entry.name, size))
        except Exception as e:
            print(f"Error scanning brain dir: {e}")
        
        brain_items.sort(key=lambda x: x[1], reverse=True)
        for name, size in brain_items[:15]:
            size_mb = size / (1024 * 1024)
            size_gb = size / (1024 * 1024 * 1024)
            print(f"  brain/{name:<35} : {size_gb:8.3f} GB ({size_mb:8.2f} MB)")

        # Let's find the top 20 largest files in the entire antigravity directory
        print("\n=== Top 20 Largest Files in C:\\Users\\owner\\.gemini\\antigravity ===")
        all_files = []
        try:
            for dirpath, dirnames, filenames in os.walk(base_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        try:
                            size = os.path.getsize(fp)
                            all_files.append((fp, size))
                        except OSError:
                            pass
        except Exception as e:
            print(f"Error finding largest files: {e}")
        
        all_files.sort(key=lambda x: x[1], reverse=True)
        for fp, size in all_files[:20]:
            size_mb = size / (1024 * 1024)
            # Make path relative to base_dir for display
            rel_path = os.path.relpath(fp, base_dir)
            print(f"  {rel_path:<80} : {size_mb:8.2f} MB")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()
