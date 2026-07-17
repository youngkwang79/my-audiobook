
with open('content-factory/scripts/gemini_writer.py', 'rb') as f:
    lines = f.readlines()

for i, line in enumerate(lines[230:270], start=231):
    try:
        decoded = line.decode('utf-8').rstrip()
        print(i, decoded)
    except Exception:
        print(i, '[decode error]')
