import os
import re

ROOT_DIR = r"d:\소설 유투브\my-audiobook\my_audiobook"
APP_DIR = os.path.join(ROOT_DIR, "app")
LIB_DIR = os.path.join(ROOT_DIR, "lib")

# Next.js App Router entry points (pages, layouts, API routes, templates, etc.)
ENTRY_PATTERNS = [
    r"page\.tsx$",
    r"layout\.tsx$",
    r"route\.ts$",
    r"template\.tsx$",
    r"loading\.tsx$",
    r"error\.tsx$",
    r"not-found\.tsx$",
]

IMPORT_REGEX = re.compile(
    r'(?:import|export)\s+(?:type\s+)?(?:[^"\';]+?\s+from\s+)?["\']([^"\']+)["\']'
    r'|import\s*\(["\']([^"\']+)["\']\)'
    r'|require\s*\(["\']([^"\']+)["\']\)'
)

def get_all_code_files():
    files = []
    for root, dirs, filenames in os.walk(APP_DIR):
        # Skip brain/ conversation directory
        if "brain" in root.split(os.sep):
            continue
        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".css")):
                files.append(os.path.join(root, f))
    for root, dirs, filenames in os.walk(LIB_DIR):
        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".css")):
                files.append(os.path.join(root, f))
    return files

def resolve_import(source_file, import_path):
    # Resolve aliases
    if import_path.startswith("@/"):
        rel_path = import_path[2:]
        abs_path = os.path.join(ROOT_DIR, rel_path.replace("/", os.sep))
    elif import_path.startswith("."):
        dir_name = os.path.dirname(source_file)
        abs_path = os.path.normpath(os.path.join(dir_name, import_path.replace("/", os.sep)))
    else:
        # Third party library
        return None

    # Check if direct match
    if os.path.isfile(abs_path):
        return abs_path

    # Try extensions
    for ext in [".tsx", ".ts", ".jsx", ".js", ".css"]:
        if os.path.isfile(abs_path + ext):
            return abs_path + ext
        # If it's a directory, check index file
        if os.path.isdir(abs_path):
            index_path = os.path.join(abs_path, "index" + ext)
            if os.path.isfile(index_path):
                return index_path
            
    return None

def main():
    all_files = get_all_code_files()
    
    # Identify entry points
    entry_points = []
    for f in all_files:
        basename = os.path.basename(f)
        if any(re.search(pattern, basename) for pattern in ENTRY_PATTERNS):
            entry_points.append(f)
            
    print(f"Total code files found: {len(all_files)}")
    print(f"Entry points identified: {len(entry_points)}")
    
    # Build adjacency list
    graph = {}
    for f in all_files:
        graph[f] = []
        if f.endswith((".ts", ".tsx", ".js", ".jsx")):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    content = file.read()
                matches = IMPORT_REGEX.findall(content)
                for match in matches:
                    # findall returns tuple for groups
                    imp = next((group for group in match if group), None)
                    if imp:
                        resolved = resolve_import(f, imp)
                        if resolved:
                            graph[f].append(resolved)
            except Exception as e:
                print(f"Error reading {f}: {e}")

    # BFS/DFS to find all reachable files
    visited = set()
    queue = list(entry_points)
    
    # We also consider next.config.ts / tsconfig.json as roots?
    # No, we just start from page/layout/route entry points.
    
    while queue:
        curr = queue.pop(0)
        if curr not in visited:
            visited.add(curr)
            for neighbor in graph.get(curr, []):
                if neighbor not in visited:
                    queue.append(neighbor)
                    
    print(f"Reachable files: {len(visited)}")
    
    unused_files = [f for f in all_files if f not in visited]
    print(f"Unused files: {len(unused_files)}")
    
    print("\n--- Unused Files List ---")
    for uf in sorted(unused_files):
        # Print relative to ROOT_DIR
        print(os.path.relpath(uf, ROOT_DIR))

if __name__ == "__main__":
    main()
