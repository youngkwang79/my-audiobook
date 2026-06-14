import edge_tts
import edge_tts.communicate
import asyncio

# Custom mkssml that detects if the text is already an SSML document
def custom_mkssml(tc, escaped_text):
    if isinstance(escaped_text, bytes):
        escaped_text = escaped_text.decode("utf-8")
    if escaped_text.strip().startswith("<speak"):
        return escaped_text
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
        f"{escaped_text}"
        "</prosody>"
        "</voice>"
        "</speak>"
    )

# Apply monkeypatch
edge_tts.communicate.mkssml = custom_mkssml

async def run_test():
    voice = "ko-KR-HyunsuNeural"
    pitch = "-6Hz"
    rate = "-6%"
    boosted_pitch = "+9Hz"

    # Try nested prosody tag structure
    voice_long = "Microsoft Server Speech Text to Speech Voice (ko-KR, HyunsuNeural)"
    ssml = (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
        f"<voice name='{voice_long}'>"
        f"<prosody pitch='{pitch}' rate='{rate}'>"
        f"안녕하세<prosody pitch='{boosted_pitch}'>요?</prosody> 오늘 날씨가 참 좋습니다."
        f"</prosody>"
        f"</voice>"
        "</speak>"
    )

    print("Formed Custom SSML (nested prosody):")
    print(ssml)

    communicate = edge_tts.Communicate(text="dummy", voice=voice, pitch=pitch, rate=rate)
    communicate.texts = [ssml]

    try:
        await communicate.save("test_out.mp3")
        print("Successfully generated test_out.mp3!")
    except Exception as e:
        print("Failed with error:", e)

if __name__ == "__main__":
    asyncio.run(run_test())
