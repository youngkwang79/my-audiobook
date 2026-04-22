
import re

def find_unbalanced_tags_with_lines(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    tag_pattern = re.compile(r'<(/?)(div|section|button|p|h1|h2|h3|span|motion\.div|AnimatePresence)(?:\s|>|/|$)')
    
    for i, line in enumerate(lines):
        line_num = i + 1
        # Skip comments
        if line.strip().startswith('//'): continue
        
        matches = tag_pattern.finditer(line)
        for match in matches:
            is_closing = match.group(1) == '/'
            tag_name = match.group(2)
            
            # Check for self-closing
            if not is_closing:
                # Find the end of this tag in the same line or subsequent lines
                # This is crude, but we can check if '/>' appears before the next tag
                if line[match.end():].strip().startswith('/>') or '/>' in line[match.end():line.find('>', match.end())+1]:
                    # Self-closing, ignore
                    continue
                
                stack.append((tag_name, line_num))
            else:
                if not stack:
                    print(f"Extra closing tag </{tag_name}> at line {line_num}")
                    continue
                top_tag, top_line = stack.pop()
                if top_tag != tag_name:
                    print(f"Mismatched tag at line {line_num}: expected </{top_tag}> (from line {top_line}), got </{tag_name}>")

    if stack:
        for tag, line in stack:
            print(f"Unclosed tag <{tag}> at line {line}")

find_unbalanced_tags_with_lines('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx')
