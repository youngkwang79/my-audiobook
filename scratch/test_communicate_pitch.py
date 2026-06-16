import asyncio
import edge_tts

async def test():
    # Test 1: InJoon with pitch -10Hz (via Communicate constructor)
    print("Testing InJoon -10Hz...")
    c1 = edge_tts.Communicate(text="안녕하세요.", voice="ko-KR-InJoonNeural", pitch="-10Hz")
    try:
        await c1.save("test_c1.mp3")
        print("InJoon -10Hz SUCCESS")
    except Exception as e:
        print(f"InJoon -10Hz FAILED: {e}")

    # Test 2: InJoon with pitch -10% (via Communicate constructor)
    print("Testing InJoon -10%...")
    c2 = edge_tts.Communicate(text="안녕하세요.", voice="ko-KR-InJoonNeural", pitch="-10%")
    try:
        await c2.save("test_c2.mp3")
        print("InJoon -10% SUCCESS")
    except Exception as e:
        print(f"InJoon -10% FAILED: {e}")

    # Test 3: InJoon with pitch -5Hz (via Communicate constructor)
    print("Testing InJoon -5Hz...")
    c3 = edge_tts.Communicate(text="안녕하세요.", voice="ko-KR-InJoonNeural", pitch="-5Hz")
    try:
        await c3.save("test_c3.mp3")
        print("InJoon -5Hz SUCCESS")
    except Exception as e:
        print(f"InJoon -5Hz FAILED: {e}")

asyncio.run(test())
