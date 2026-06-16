import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    # Test flat structure (no nesting, individual wrapping)
    print("Testing flat structure...")
    ssml = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        "<prosody pitch='-10Hz' rate='+0%'>안녕하세요. </prosody>"
        "<prosody pitch='+5Hz' rate='+0%'>반갑습니다? </prosody>"
        "</voice>"
        "</speak>"
    )
    c = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c.texts = [ssml]
    try:
        await c.save("test_flat.mp3")
        print("Flat structure SUCCESS")
    except Exception as e:
        print(f"Flat structure FAILED: {e}")

asyncio.run(test())
