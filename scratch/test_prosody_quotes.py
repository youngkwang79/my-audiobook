import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test 1: SSML with &quot;
    print("Testing SSML with &quot;...")
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>&quot;안녕하세요.&quot;</prosody>"
        "</voice>"
        "</speak>"
    )
    c1 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c1.texts = [ssml_1]
    try:
        await c1.save("test_quote_1.mp3")
        print("SSML 1 SUCCESS")
    except Exception as e:
        print(f"SSML 1 FAILED: {e}")

    # Test 2: SSML with real quotes
    print("Testing SSML with real quotes...")
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>\"안녕하세요.\"</prosody>"
        "</voice>"
        "</speak>"
    )
    c2 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c2.texts = [ssml_2]
    try:
        await c2.save("test_quote_2.mp3")
        print("SSML 2 SUCCESS")
    except Exception as e:
        print(f"SSML 2 FAILED: {e}")

    # Test 3: SSML with Korean quotes (character)
    print("Testing SSML with Korean quotes...")
    ssml_3 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>'안녕하세요.'</prosody>"
        "</voice>"
        "</speak>"
    )
    c3 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c3.texts = [ssml_3]
    try:
        await c3.save("test_quote_3.mp3")
        print("SSML 3 SUCCESS")
    except Exception as e:
        print(f"SSML 3 FAILED: {e}")

asyncio.run(test())
