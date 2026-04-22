
def trace_depth_full(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    depth = 0
    paren_depth = 0
    line_num = 1
    col_num = 1
    
    in_string = False
    string_char = ''
    
    for i, char in enumerate(content):
        if char == '\n':
            line_num += 1
            col_num = 1
            continue
        
        if not in_string:
            if char in '"\'`':
                in_string = True
                string_char = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
            elif char == '(':
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
            
            if 2450 <= line_num <= 2520:
                if char in '{}()':
                    print(f"L{line_num}C{col_num}: {char} [D:{depth}, P:{paren_depth}]")
        else:
            if char == string_char:
                if content[i-1] != '\\':
                    in_string = False
        
        col_num += 1

trace_depth_full('c:/Users/owner/Desktop/my-audiobook/my_audiobook/app/components/game/InnPanel.tsx')
