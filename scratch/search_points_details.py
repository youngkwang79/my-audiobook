import os

file_path = r"d:\소설 유투브\my-audiobook\my_audiobook\app\points\page.tsx"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check for payment, requestPayment, or response
    for idx, line in enumerate(content.splitlines()):
        if "response" in line.lower() or "payment" in line.lower():
            print(f"{idx+1}: {line.strip()}")
except Exception as e:
    print("Error:", e)
