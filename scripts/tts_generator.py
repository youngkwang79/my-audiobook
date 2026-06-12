import asyncio
import argparse
import sys
import os
import edge_tts

# Handle UTF-8 encoding for standard output on Windows
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

async def amain():
    parser = argparse.ArgumentParser(description="Generate MP3 from text using Microsoft Edge TTS")
    parser.add_argument("--text", help="Text content to speak or file path containing text")
    parser.add_argument("--text-file", help="Path to a text file containing content")
    parser.add_argument("--voice", default="ko-KR-InJoonNeural", help="Voice model")
    parser.add_argument("--pitch", default="+0Hz", help="Voice pitch adjustment (e.g. -6Hz)")
    parser.add_argument("--rate", default="+0%", help="Voice speed rate adjustment (e.g. -6%)")
    parser.add_argument("--output", required=True, help="Output MP3 file path")
    args = parser.parse_args()

    content = ""
    if args.text_file:
        if not os.path.exists(args.text_file):
            print(f"Error: Text file not found: {args.text_file}", file=sys.stderr)
            sys.exit(1)
        with open(args.text_file, "r", encoding="utf-8") as f:
            content = f.read()
    elif args.text:
        content = args.text
    else:
        print("Error: Either --text or --text-file must be provided", file=sys.stderr)
        sys.exit(1)

    if not content.strip():
        print("Error: Text content is empty", file=sys.stderr)
        sys.exit(1)

    print(f"Synthesizing with Voice: {args.voice}, Pitch: {args.pitch}, Rate: {args.rate}")
    
    communicate = edge_tts.Communicate(
        text=content,
        voice=args.voice,
        pitch=args.pitch,
        rate=args.rate
    )
    
    # Ensure directory of output exists
    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
        
    await communicate.save(args.output)
    print(f"Success: {args.output}")

if __name__ == "__main__":
    asyncio.run(amain())
