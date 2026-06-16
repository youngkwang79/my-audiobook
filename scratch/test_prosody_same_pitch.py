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
        await c.save(f"test_same_{name}.mp3")
        print(f"Combination {name} SUCCESS (count: {len(sentences)})")
    except Exception as e:
        print(f"Combination {name} FAILED: {e}")

async def test():
    s1 = "<prosody pitch='-10Hz' rate='+0%'>살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.</prosody>"
    s2 = "<prosody pitch='-10Hz' rate='+0%'>&quot;여기 쥐새끼가 숨어 있었군.</prosody>"
    s5 = "<prosody pitch='-10Hz' rate='+0%'>진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다.</prosody>"
    s6 = "<prosody pitch='-10Hz' rate='+0%'> 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.</prosody>"

    # Test combining all sentences of the same pitch (-10Hz)
    await test_ssml([s1, s2, s5, s6], "same_pitch_4")

asyncio.run(test())
