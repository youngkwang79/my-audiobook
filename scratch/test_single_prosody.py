import asyncio
import edge_tts
import re

# Apply monkeypatch to let us test arbitrary SSML
def custom_mkssml(tc, escaped_text):
    return escaped_text

edge_tts.communicate.mkssml = custom_mkssml

async def test():
    print("Testing single outer prosody SSML...")
    content = '살수들의 우두머리가 서늘한 안광을 흘리며 사당 안을 쓸어내렸다.\n"여기 쥐새끼가 숨어 있었군. 흠, 옆에 있는 늙은이는 뭐냐? 동행인가?"\n진우는 숨이 턱 막히는 살기를 느끼면서도 노인의 앞을 가로막아서며 검을 겨누었다. 손끝이 덜덜 떨렸지만, 눈빛만큼은 불타고 있었다.'
    
    def xml_escape(s):
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")
    
    body_content = xml_escape(content)
    body_content = re.sub(r'\.{2,}|…', '<break time="500ms"/>', body_content)
    body_content = re.sub(r'&quot;(.*?)&quot;', r'&quot;\1&quot;<break time="700ms"/>', body_content)

    ssml = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        "<voice name='ko-KR-InJoonNeural'>"
        f"<prosody pitch='-10Hz' rate='+0%'>"
        f"{body_content}"
        f"</prosody>"
        f"</voice>"
        "</speak>"
    )
    
    c = edge_tts.Communicate(text="dummy", voice="ko-KR-InJoonNeural")
    c.texts = [ssml]
    try:
        await c.save("test_single_prosody.mp3")
        print("SUCCESS")
    except Exception as e:
        print(f"FAILED: {e}")

asyncio.run(test())
