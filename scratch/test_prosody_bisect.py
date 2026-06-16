import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test_ssml(ssml, name):
    c = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c.texts = [ssml]
    try:
        await c.save(f"test_bisect_{name}.mp3")
        print(f"{name} SUCCESS")
    except Exception as e:
        print(f"{name} FAILED: {e}")

async def test():
    # Sentence 1: 살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.
    s1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s1, "s1")

    # Sentence 2: &quot;여기 쥐새끼가 숨어 있었군.
    s2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;여기 쥐새끼가 숨어 있었군.</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s2, "s2")

    # Sentence 3:  흠, 옆에 있는 늙은이는 뭐냐?
    s3 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='+5Hz' rate='+0%'> 흠, 옆에 있는 늙은이는 뭐냐?</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s3, "s3")

    # Sentence 4:  동행인가?
    s4 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='+5Hz' rate='+0%'> 동행인가?</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s4, "s4")

    # Sentence 5: 진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다.
    s5 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다.</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s5, "s5")

    # Sentence 6:  손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.
    s6 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'> 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.</prosody>"
        "</voice>"
        "</speak>"
    )
    await test_ssml(s6, "s6")

asyncio.run(test())
