import os
import glob
import re

novel_files = glob.glob("novel_*.py")

for filepath in novel_files:
    # Skip novel_cleaner.py if it starts with novel_
    if filepath == "novel_cleaner.py":
        continue
        
    print(f"Processing: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Check if write statement is in the file
    if 'with open(filename, "w"' in content:
        # Find where chapter_text is generated and written
        # We want to insert clean_text logic before writing the file
        # Let's replace the write block
        old_pattern = 'with open(filename, "w", encoding="utf-8") as f:'
        
        # If it's already using clean_text, skip
        if "clean_text" in content:
            print(f"-> Already contains clean_text, skipping: {filepath}")
            continue
            
        new_pattern = 'from novel_cleaner import clean_text\n    chapter_text = clean_text(chapter_text)\n    with open(filename, "w", encoding="utf-8") as f:'
        
        updated_content = content.replace(old_pattern, new_pattern)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"-> Successfully updated: {filepath}")
    else:
        print(f"-> Did not find file write block in: {filepath}")
