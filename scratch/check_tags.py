
import re

def find_unbalanced_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments to avoid false positives
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    # content = re.sub(r'`.*?`', '', content, flags=re.DOTALL) # Careful with templates
    
    tags = re.findall(r'<(div|/div|section|/section|button|/button|p|/p|h1|/h1|h2|/h2|h3|/h3|span|/span|motion\.div|/motion\.div|AnimatePresence|/AnimatePresence)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                print(f"Extra closing tag: {tag}")
                continue
            top = stack.pop()
            if top != tag[1:]:
                print(f"Mismatched tag: expected {top}, got {tag}")
        else:
            stack.append(tag)
    
    if stack:
        print(f"Unclosed tags: {stack}")
    else:
        print("Tags are balanced (in crude filter)")

find_unbalanced_tags('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx')
