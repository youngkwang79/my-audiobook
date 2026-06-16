import asyncio
import edge_tts

async def test():
    # Test 4: Plain text without custom SSML
    print("Testing Plain Text InJoon...")
    communicate = edge_tts.Communicate(text="안녕하세요.", voice="ko-KR-InJoonNeural")
    try:
        await communicate.save("test_4.mp3")
        print("Plain InJoon SUCCESS")
    except Exception as e:
        print(f"Plain InJoon FAILED: {e}")

    # Test 5: Plain text Hyunsu Multilingual
    print("Testing Plain Text Hyunsu Multilingual...")
    communicate = edge_tts.Communicate(text="안녕하세요.", voice="ko-KR-HyunsuMultilingualNeural")
    try:
        await communicate.save("test_5.mp3")
        print("Plain Hyunsu Multilingual SUCCESS")
    except Exception as e:
        print(f"Plain Hyunsu Multilingual FAILED: {e}")

asyncio.run(test())
