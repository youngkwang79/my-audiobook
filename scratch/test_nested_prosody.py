import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test 1: Plain SSML without nesting
    print("Testing SSML without nesting...")
    ssml_1 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. 반갑습니다."
        "</prosody>"
        "</voice>"
        "</speak>"
    )
    c1 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c1.texts = [ssml_1]
    try:
        await c1.save("test_nest_1.mp3")
        print("SSML without nesting SUCCESS")
    except Exception as e:
        print(f"SSML without nesting FAILED: {e}")

    # Test 2: SSML with nested prosody
    print("Testing SSML with nested prosody...")
    ssml_2 = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>"
        "안녕하세요. <prosody pitch='+5Hz'>반갑습니다.</prosody>"
        "</prosody>"
        "</voice>"
        "</speak>"
    )
    c2 = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c2.texts = [ssml_2]
    try:
        await c2.save("test_nest_2.mp3")
        print("SSML with nested prosody SUCCESS")
    except Exception as e:
        print(f"SSML with nested prosody FAILED: {e}")

asyncio.run(test())
