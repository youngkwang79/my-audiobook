import asyncio
import edge_tts

async def test():
    # Test 1: InJoon with pitch -10Hz
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요."
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    # Test 2: InJoon with pitch -10%
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10%' rate='+0%'>"
        "안녕하세요."
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    # Test 3: HyunsuMultilingualNeural with pitch -10Hz
    ssml_3 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-HyunsuMultilingualNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요."
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    # Test 4: HyunsuMultilingualNeural with pitch -10%
    ssml_4 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-HyunsuMultilingualNeural'>"
        "<prosody pitch='-10%' rate='+0%'>"
        "안녕하세요."
        "</prosody>"
        "</voice>"
        "</speak>"
    )

    for i, ssml in enumerate([ssml_1, ssml_2, ssml_3, ssml_4], 1):
        name = ["InJoon -10Hz", "InJoon -10%", "Hyunsu -10Hz", "Hyunsu -10%"][i-1]
        print(f"Testing {name}...")
        communicate = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
        communicate.texts = [ssml]
        try:
            await communicate.save(f"test_pitch_{i}.mp3")
            print(f"{name} SUCCESS")
        except Exception as e:
            print(f"{name} FAILED: {e}")

asyncio.run(test())
