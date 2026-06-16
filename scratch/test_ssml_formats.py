import asyncio
import edge_tts

async def test():
    # Test 1: Simple text with pitch/rate
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요."
        "</prosody>"
        "</voice>"
        "</speak>"
    )
    
    # Test 2: Nested prosody
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. <prosody pitch='+5Hz'>반갑습니다?</prosody>"
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    # Test 3: No nested prosody but pitch/rate
    ssml_3 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. 반갑습니다?"
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    for i, ssml in enumerate([ssml_1, ssml_2, ssml_3], 1):
        print(f"Testing SSML {i}...")
        communicate = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
        communicate.texts = [ssml]
        try:
            await communicate.save(f"test_{i}.mp3")
            print(f"SSML {i} SUCCESS")
        except Exception as e:
            print(f"SSML {i} FAILED: {e}")

asyncio.run(test())
