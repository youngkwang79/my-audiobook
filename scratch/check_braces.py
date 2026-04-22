
def check_jsx_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    line_num = 0
    for line in lines:
        line_num += 1
        # Very crude check for ternary and braces
        for char in line:
            if char == '{':
                stack.append(('{', line_num))
            elif char == '}':
                if not stack:
                    print(f"Extra }} at line {line_num}")
                    return
                top, l = stack.pop()
                if top != '{':
                    print(f"Mismatched }} at line {line_num}, expected {top} from line {l}")
                    return
            elif char == '(':
                 stack.append(('(', line_num))
            elif char == ')':
                if not stack:
                    print(f"Extra ) at line {line_num}")
                    return
                top, l = stack.pop()
                if top != '(':
                    print(f"Mismatched ) at line {line_num}, expected {top} from line {l}")
                    return
    
    if stack:
        print(f"Unclosed items in stack: {stack}")
    else:
        print("Braces and parens balanced (crude check)")

check_jsx_balance('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx')
