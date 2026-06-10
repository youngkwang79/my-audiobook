import os
import re
import json

ROOT_DIR = r"d:\소설 유투브\my-audiobook\my_audiobook"
APP_DIR = os.path.join(ROOT_DIR, "app")
LIB_DIR = os.path.join(ROOT_DIR, "lib")
REPORT_PATH = os.path.join(ROOT_DIR, "scratch", "unused_code_report.txt")

ENTRY_PATTERNS = [
    r"page\.tsx$",
    r"layout\.tsx$",
    r"route\.ts$",
    r"template\.tsx$",
    r"loading\.tsx$",
    r"error\.tsx$",
    r"not-found\.tsx$",
]

def get_all_code_files():
    files = []
    for root, dirs, filenames in os.walk(APP_DIR):
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
    if import_path.startswith("@/"):
        rel_path = import_path[2:]
        abs_path = os.path.join(ROOT_DIR, rel_path.replace("/", os.sep))
    elif import_path.startswith("."):
        dir_name = os.path.dirname(source_file)
        abs_path = os.path.normpath(os.path.join(dir_name, import_path.replace("/", os.sep)))
    else:
        return None

    if os.path.isfile(abs_path):
        return abs_path

    for ext in [".tsx", ".ts", ".jsx", ".js", ".css"]:
        if os.path.isfile(abs_path + ext):
            return abs_path + ext
        if os.path.isdir(abs_path):
            index_path = os.path.join(abs_path, "index" + ext)
            if os.path.isfile(index_path):
                return index_path
    return None

def analyze_unused():
    code_files = get_all_code_files()
    
    # 1. Unused Files Scan (BFS from Next.js Page/Layout/Route entry points)
    entry_points = []
    for f in code_files:
        basename = os.path.basename(f)
        if any(re.search(pattern, basename) for pattern in ENTRY_PATTERNS):
            entry_points.append(f)
            
    # Parse imports
    graph = {}
    import_regex = re.compile(
        r'(?:import|export)\s+(?:type\s+)?(?:[^"\';]+?\s+from\s+)?["\']([^"\']+)["\']'
        r'|import\s*\(["\']([^"\']+)["\']\)'
        r'|require\s*\(["\']([^"\']+)["\']\)'
    )
    
    file_contents = {}
    for f in code_files:
        graph[f] = []
        if f.endswith((".ts", ".tsx", ".js", ".jsx")):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    content = file.read()
                    file_contents[f] = content
                matches = import_regex.findall(content)
                for match in matches:
                    imp = next((group for group in match if group), None)
                    if imp:
                        resolved = resolve_import(f, imp)
                        if resolved:
                            graph[f].append(resolved)
            except Exception as e:
                print(f"Error parsing file {f}: {e}")

    visited = set()
    queue = list(entry_points)
    while queue:
        curr = queue.pop(0)
        if curr not in visited:
            visited.add(curr)
            for neighbor in graph.get(curr, []):
                if neighbor not in visited:
                    queue.append(neighbor)
                    
    unused_files = [f for f in code_files if f not in visited]
    
    # 2. Unused Exports Scan
    # We find all exported function/class/const names from files, and search if they are imported/referenced in other files.
    unused_exports = {}
    
    # Export regexes
    export_named_regex = re.compile(
        r'^export\s+(?:const|let|var|function|class|type|interface|enum)\s+([a-zA-Z0-9_]+)',
        re.MULTILINE
    )
    
    for f in visited: # Only scan files that are actually reachable
        if f.endswith((".ts", ".tsx")) and not any(re.search(p, os.path.basename(f)) for p in ENTRY_PATTERNS):
            content = file_contents.get(f, "")
            exports = export_named_regex.findall(content)
            if not exports:
                continue
            
            rel_file = os.path.relpath(f, ROOT_DIR)
            unused_exports[rel_file] = []
            
            for exp in exports:
                # Ignore common or generic names to avoid false negatives/positives
                if exp in ["Page", "Layout", "Metadata", "default"]:
                    continue
                
                # Check if this export is imported in any other reachable file
                is_used = False
                # Form a search pattern to see if the name is imported or referenced in another file
                # Check import { ... exp ... } or import exp or similar
                # Simple check: does the name appear as a word in other files?
                # To be safe, we check if it is imported from this file's module path or just referenced.
                # Let's check if the word exists in any other reachable file.
                word_re = re.compile(r'\b' + re.escape(exp) + r'\b')
                for other_f in visited:
                    if other_f == f:
                        continue
                    other_content = file_contents.get(other_f, "")
                    if word_re.search(other_content):
                        is_used = True
                        break
                if not is_used:
                    unused_exports[rel_file].append(exp)
            
            # Clean up empty lists
            if not unused_exports[rel_file]:
                del unused_exports[rel_file]
                
    # 3. Unused NPM Dependencies Scan
    package_json_path = os.path.join(ROOT_DIR, "package.json")
    unused_deps = []
    if os.path.exists(package_json_path):
        with open(package_json_path, "r", encoding="utf-8") as pf:
            pkg = json.load(pf)
        dependencies = pkg.get("dependencies", {})
        
        for dep in dependencies:
            # Skip framework core
            if dep in ["next", "react", "react-dom"]:
                continue
            
            # Search if this package is imported in any code file
            is_used = False
            # Check for matches like: from "dep" or from 'dep' or require("dep") or import("dep")
            # For scoped packages or subpaths, check prefix.
            dep_escaped = re.escape(dep)
            dep_re = re.compile(r'from\s+["\']' + dep_escaped + r'(?:/[^"\']*)?["\']|require\s*\(\s*["\']' + dep_escaped + r'(?:/[^"\']*)?["\']|import\s*\(\s*["\']' + dep_escaped + r'(?:/[^"\']*)?["\']')
            
            for f in code_files:
                content = file_contents.get(f, "")
                if dep_re.search(content):
                    is_used = True
                    break
            if not is_used:
                unused_deps.append(dep)

    # Write report
    with open(REPORT_PATH, "w", encoding="utf-8") as rf:
        rf.write("=========================================\n")
        rf.write("          UNUSED CODE REPORT             \n")
        rf.write("=========================================\n\n")
        
        rf.write("--- 1. UNUSED FILES ---\n")
        rf.write(f"Total: {len(unused_files)} files\n")
        for uf in sorted(unused_files):
            rf.write(f"- {os.path.relpath(uf, ROOT_DIR)}\n")
        rf.write("\n")
        
        rf.write("--- 2. UNUSED EXPORTED FUNCTIONS / VARIABLES ---\n")
        rf.write(f"Total files with unused exports: {len(unused_exports)}\n")
        for f, exps in sorted(unused_exports.items()):
            rf.write(f"- {f}\n")
            for exp in exps:
                rf.write(f"    * {exp}\n")
        rf.write("\n")
        
        rf.write("--- 3. UNUSED NPM DEPENDENCIES ---\n")
        rf.write(f"Total: {len(unused_deps)} libraries\n")
        for dep in sorted(unused_deps):
            rf.write(f"- {dep}\n")
            
    print(f"Report successfully written to {REPORT_PATH}")
    print(f"Unused files count: {len(unused_files)}")
    print(f"Unused exports count: {sum(len(v) for v in unused_exports.values())}")
    print(f"Unused dependencies count: {len(unused_deps)}")

if __name__ == "__main__":
    analyze_unused()
