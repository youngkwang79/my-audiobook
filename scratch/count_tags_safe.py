
import re

def count_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    
    # Find all <div ... > (not ending in />)
    opens = re.findall(r'<div(?!\s+[^>]*/>)[^>]*>', content)
    closes = re.findall(r'</div\s*>', content)
    
    print(f"Open divs (non-self-closing): {len(opens)}")
    print(f"Closing divs: {len(closes)}")
    
    # Also check motion.div
    m_opens = re.findall(r'<motion\.div(?!\s+[^>]*/>)[^>]*>', content)
    m_closes = re.findall(r'</motion\.div\s*>', content)
    
    print(f"Open motion.divs: {len(m_opens)}")
    print(f"Closing motion.divs: {len(m_closes)}")

count_tags('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx')
