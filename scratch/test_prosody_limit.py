import asyncio
import edge_tts

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test_ssml(sentences, name):
    body = "".join(sentences)
    ssml = f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='ko-KR-InJoonNeural'>{body}</voice></speak>"
    c = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c.texts = [ssml]
    try:
        await c.save(f"test_limit_{name}.mp3")
        print(f"Count {len(sentences)} SUCCESS")
    except Exception as e:
        print(f"Count {len(sentences)} FAILED: {e}")

async def test():
    s1 = "<prosody pitch='-10Hz' rate='+0%'>살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.</prosody>"
    s2 = "<prosody pitch='-10Hz' rate='+0%'>&quot;여기 쥐새끼가 숨어 있었군.</prosody>"
    s3 = "<prosody pitch='-10Hz' rate='+0%'> 흠, 옆에 있는 늙은이는 뭐냐?</prosody>"

    await test_ssml([s1], "1")
    await test_ssml([s1, s2], "2")
    await test_ssml([s1, s2, s3], "3")

asyncio.run(test())
