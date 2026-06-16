import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test 1: Only quote inside prosody
    print("Testing SSML with only quote inside prosody...")
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>안녕하세요. </prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>반갑습니다. </prosody>"
        "</voice>"
        "</speak>"
    )
    c1 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c1.texts = [ssml_1]
    try:
        await c1.save("test_no_letters_1.mp3")
        print("SSML 1 SUCCESS")
    except Exception as e:
        print(f"SSML 1 FAILED: {e}")

    # Test 2: No prosody wrapping for the quote alone (keep it unwrapped)
    print("Testing SSML without wrapping quote in prosody...")
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;여기 쥐새끼가 숨어 있었군.</prosody>"
        "<prosody pitch='+5Hz' rate='+0%'> 흠, 옆에 있는 늙은이는 뭐냐?</prosody>"
        "<prosody pitch='+5Hz' rate='+0%'> 동행인가?</prosody>"
        "&quot;"
        "<prosody pitch='-10Hz' rate='+0%'>진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다.</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'> 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.</prosody>"
        "</voice>"
        "</speak>"
    )
    c2 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c2.texts = [ssml_2]
    try:
        await c2.save("test_no_letters_2.mp3")
        print("SSML 2 SUCCESS")
    except Exception as e:
        print(f"SSML 2 FAILED: {e}")

asyncio.run(test())
