import asyncio
import edge_tts

async def main():
    text = "안녕하세요. 무림북 오디오북 생성 테스트입니다."
    voice = "ko-KR-InJoonNeural"
    pitch = "-6Hz"
    rate = "-6%"
    output_file = "scratch/test_tts.mp3"
    
    communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
    await communicate.save(output_file)
    print("Success! Created:", output_file)

if __name__ == "__main__":
    asyncio.run(main())
