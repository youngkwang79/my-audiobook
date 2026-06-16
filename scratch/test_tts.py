import asyncio
import os
import sys

# Add root directory to python path
sys.path.append(os.getcwd())

from scripts.tts_generator import amain

# Override sys.argv
sys.argv = [
    "tts_generator.py",
    "--text=" + '살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.\n"여기 쥐새끼가 숨어 있었군. 흠, 옆에 있는 늙은이는 뭐냐? 동행인가?"\n진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다. 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.',
    "--voice=ko-KR-InJoonNeural",
    "--pitch=-10Hz",
    "--rate=+0%",
    "--output=test_preview_full.mp3"
]

try:
    asyncio.run(amain())
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
