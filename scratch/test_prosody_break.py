import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test with break tag
    print("Testing SSML with break tag...")
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. <break time='500ms'/> 반갑습니다."
        "</prosody>"
        "</voice>"
        "</speak>"
    )
    c1 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c1.texts = [ssml_1]
    try:
        await c1.save("test_break_1.mp3")
        print("SSML 1 (with break) SUCCESS")
    except Exception as e:
        print(f"SSML 1 FAILED: {e}")

    # Test without break tag
    print("Testing SSML without break tag...")
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. 반갑습니다."
        "</prosody>"
        "</voice>"
        "</speak>"
    )
    c2 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c2.texts = [ssml_2]
    try:
        await c2.save("test_break_2.mp3")
        print("SSML 2 (no break) SUCCESS")
    except Exception as e:
        print(f"SSML 2 FAILED: {e}")

asyncio.run(test())
