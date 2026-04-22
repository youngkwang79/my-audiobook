
with open('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"{{: {content.count('{')}")
print(f"}}: {content.count('}')}")
print(f"(: {content.count('(')}")
print(f"): {content.count(')')}")
print(f"<div: {content.count('<div')}")
print(f"</div: {content.count('</div')}")
