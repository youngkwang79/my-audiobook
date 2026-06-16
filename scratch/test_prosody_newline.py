import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test A: Whitespace/newline inside prosody
    print("Testing SSML with newline inside prosody...")
    ssml_a = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>안녕하세요. </prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>\n</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>반갑습니다. </prosody>"
        "</voice>"
        "</speak>"
    )
    c_a = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c_a.texts = [ssml_a]
    try:
        await c_a.save("test_a.mp3")
        print("SSML A SUCCESS")
    except Exception as e:
        print(f"SSML A FAILED: {e}")

    # Test B: Clean text (no empty/newline-only prosody tags)
    print("Testing SSML without empty/newline-only prosody...")
    ssml_b = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;여기 쥐새끼가 숨어 있었군.</prosody>"
        "<prosody pitch='+5Hz' rate='+0%'> 흠, 옆에 있는 늙은이는 뭐냐?</prosody>"
        "<prosody pitch='+5Hz' rate='+0%'> 동행인가?</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'>진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다.</prosody>"
        "<prosody pitch='-10Hz' rate='+0%'> 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.</prosody>"
        "</voice>"
        "</speak>"
    )
    c_b = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c_b.texts = [ssml_b]
    try:
        await c_b.save("test_b.mp3")
        print("SSML B SUCCESS")
    except Exception as e:
        print(f"SSML B FAILED: {e}")

asyncio.run(test())
