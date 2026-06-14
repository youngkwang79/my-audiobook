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

def get_openai_api_key():
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        return api_key
    
    # Try parsing .env.local in current directory or parent directories
    search_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    ]
    for env_path in search_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            if key.strip() == "OPENAI_API_KEY":
                                return val.strip().strip("'\"")
            except Exception:
                pass
    return None

def get_google_api_key():
    api_key = os.environ.get("GOOGLE_API_KEY")
    if api_key:
        return api_key
    
    # Try parsing .env.local in current directory or parent directories
    search_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    ]
    for env_path in search_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            if key.strip() == "GOOGLE_API_KEY":
                                return val.strip().strip("'\"")
            except Exception:
                pass
    return None

async def amain():
    parser = argparse.ArgumentParser(description="Generate MP3 from text using Microsoft Edge TTS / OpenAI TTS")
    parser.add_argument("--text", help="Text content to speak or file path containing text")
    parser.add_argument("--text-file", help="Path to a text file containing content")
    parser.add_argument("--voice", default="ko-KR-InJoonNeural", help="Voice model")
    parser.add_argument("--pitch", default="+0Hz", help="Voice pitch adjustment (e.g. -6Hz)")
    parser.add_argument("--rate", default="+0%", help="Voice speed rate adjustment (e.g. -6%)")
    parser.add_argument("--output", required=True, help="Output MP3 file path")
    parser.add_argument("--effect", default="none", help="Special effect filter (none, echo, radio, robot)")
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

    print(f"Synthesizing with Voice: {args.voice}, Pitch: {args.pitch}, Rate: {args.rate}, Effect: {args.effect}")
    
    import re
    
    # 1. Determine voice engine
    openai_voices = ["onyx", "alloy", "echo", "fable", "nova", "shimmer"]
    google_voices = ["ko-kr-neural2-b", "ko-kr-neural2-c", "ko-kr-neural2-a", "ko-kr-wavenet-d", "ko-kr-wavenet-b"]
    is_openai = args.voice.lower() in openai_voices
    is_google = args.voice.lower() in google_voices

    is_openai_modified = is_openai and (args.pitch != "+0Hz" or args.rate != "+0%" or args.effect != "none")
    has_filters = (args.effect and args.effect != "none") or is_openai_modified

    # Output targets
    final_output = args.output
    temp_raw = args.output + ".raw.mp3" if has_filters else args.output

    # Ensure output directory exists
    out_dir = os.path.dirname(final_output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if is_openai:
        # OpenAI Premium TTS Generation
        api_key = get_openai_api_key()
        if not api_key:
            print("Error: OPENAI_API_KEY is not set in environment or .env.local", file=sys.stderr)
            sys.exit(1)
        
        import urllib.request
        import json
        
        url = "https://api.openai.com/v1/audio/speech"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini-tts",
            "input": content,
            "voice": args.voice.lower()
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        
        try:
            print(f"Calling OpenAI TTS API for voice '{args.voice}'...")
            with urllib.request.urlopen(req) as response:
                with open(temp_raw, "wb") as f:
                    f.write(response.read())
        except Exception as e:
            print(f"Error calling OpenAI TTS API: {e}", file=sys.stderr)
            sys.exit(1)

    elif is_google:
        # Google Cloud Premium TTS Generation
        api_key = get_google_api_key()
        if not api_key:
            print("Error: GOOGLE_API_KEY is not set in environment or .env.local", file=sys.stderr)
            sys.exit(1)
            
        import urllib.request
        import json
        import base64
        
        voice_map = {
            "ko-kr-neural2-b": "ko-KR-Neural2-B",
            "ko-kr-neural2-c": "ko-KR-Neural2-C",
            "ko-kr-neural2-a": "ko-KR-Neural2-A",
            "ko-kr-wavenet-d": "ko-KR-Wavenet-D",
            "ko-kr-wavenet-b": "ko-KR-Wavenet-B"
        }
        gcp_voice_name = voice_map.get(args.voice.lower(), "ko-KR-Neural2-B")
        
        url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
        headers = {
            "Content-Type": "application/json"
        }
        
        lang_code = "ko-KR"
        parts = gcp_voice_name.split("-")
        if len(parts) >= 2:
            lang_code = f"{parts[0]}-{parts[1]}"
                
        payload = {
            "input": {
                "text": content
            },
            "voice": {
                "languageCode": lang_code,
                "name": gcp_voice_name
            },
            "audioConfig": {
                "audioEncoding": "MP3"
            }
        }
        
        # Rate mapping
        rate_val = 1.0
        rate_match = re.match(r'^([+-]?\d+)%$', args.rate)
        if rate_match:
            pct = int(rate_match.group(1))
            rate_val = round(1.0 + (pct / 100.0), 2)
            rate_val = max(0.25, min(4.0, rate_val))
        payload["audioConfig"]["speakingRate"] = rate_val
        
        # Pitch mapping
        pitch_semitones = 0.0
        pitch_match = re.match(r'^([+-]?\d+)Hz$', args.pitch)
        if pitch_match:
            hz = int(pitch_match.group(1))
            pitch_semitones = round(hz / 8.0, 1)
            pitch_semitones = max(-20.0, min(20.0, pitch_semitones))
        elif args.pitch.endswith("%"):
            pct_match = re.match(r'^([+-]?\d+)%$', args.pitch)
            if pct_match:
                pct = int(pct_match.group(1))
                pitch_semitones = round(pct * 0.12, 1)
                pitch_semitones = max(-20.0, min(20.0, pitch_semitones))
                
        payload["audioConfig"]["pitch"] = pitch_semitones
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        
        try:
            print(f"Calling Google Cloud TTS API for voice '{gcp_voice_name}' (Rate: {rate_val}, Pitch semitones: {pitch_semitones})...")
            with urllib.request.urlopen(req) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                if "audioContent" in resp_data:
                    audio_bytes = base64.b64decode(resp_data["audioContent"])
                    with open(temp_raw, "wb") as f:
                        f.write(audio_bytes)
                else:
                    print(f"Error: Google Cloud TTS response did not contain audioContent: {resp_data}", file=sys.stderr)
                    sys.exit(1)
        except Exception as e:
            print(f"Error calling Google Cloud TTS API: {e}", file=sys.stderr)
            sys.exit(1)
            
    else:
        # Standard Microsoft Edge TTS Generation
        # Calculate boosted pitch for question sentences
        boosted_pitch = "+12Hz"
        pitch_match = re.match(r'^([+-]?\d+)(Hz|%)$', args.pitch)
        if pitch_match:
            val = int(pitch_match.group(1))
            unit = pitch_match.group(2)
            if unit == 'Hz':
                boosted_val = val + 15
                boosted_pitch = f"{'+' if boosted_val >= 0 else ''}{boosted_val}Hz"
            else:
                boosted_val = val + 22
                boosted_pitch = f"{'+' if boosted_val >= 0 else ''}{boosted_val}%"

        # Split text into sentences using sentence punctuation (. ! ? \n)
        parts = re.split(r'([.!?\n])', content)
        sentences = []
        temp = ""
        for part in parts:
            if not part:
                continue
            temp += part
            if part in ('.', '!', '?', '\n'):
                sentences.append(temp)
                temp = ""
        if temp.strip():
            sentences.append(temp)

        # Group consecutive normal sentences together, and keep question sentences separate
        chunks = []
        current_chunk = []

        for s in sentences:
            is_question = s.strip().endswith('?')
            if is_question:
                if current_chunk:
                    chunks.append({
                        'text': "".join(current_chunk),
                        'is_question': False
                    })
                    current_chunk = []
                chunks.append({
                    'text': s,
                    'is_question': True
                })
            else:
                current_chunk.append(s)

        if current_chunk:
            chunks.append({
                'text': "".join(current_chunk),
                'is_question': False
            })

        # Filter out empty chunks
        chunks = [c for c in chunks if c['text'].strip()]
        if not chunks:
            print("Error: No valid text chunks to synthesize", file=sys.stderr)
            sys.exit(1)

        if len(chunks) == 1:
            # Optimization: Only 1 chunk, synthesize directly without split/concat
            pitch_to_use = boosted_pitch if chunks[0]['is_question'] else args.pitch
            communicate = edge_tts.Communicate(
                text=chunks[0]['text'],
                voice=args.voice,
                pitch=pitch_to_use,
                rate=args.rate
            )
            await communicate.save(temp_raw)
        else:
            # Multiple chunks: synthesize in parallel with semaphore, then concat bytes in memory
            sem = asyncio.Semaphore(5)
            async def get_audio_bytes(chunk_item):
                async with sem:
                    pitch_to_use = boosted_pitch if chunk_item['is_question'] else args.pitch
                    communicate = edge_tts.Communicate(
                        text=chunk_item['text'],
                        voice=args.voice,
                        pitch=pitch_to_use,
                        rate=args.rate
                    )
                    data = bytearray()
                    async for message in communicate.stream():
                        if message["type"] == "audio":
                            data.extend(message["data"])
                    return data

            # Run all synthesis tasks in parallel in memory
            tasks = [get_audio_bytes(c) for c in chunks]
            results = await asyncio.gather(*tasks)

            # Concatenate all MP3 byte data
            combined_data = bytearray()
            for r in results:
                combined_data.extend(r)

            # Write the combined data to output file
            with open(temp_raw, "wb") as f:
                f.write(combined_data)

    if has_filters:
        import subprocess
        # Build filter chain
        filters = []

        # OpenAI 음높이/속도 조절 필터 추가
        if is_openai:
            # Parse pitch factor
            pitch_match = re.match(r'^([+-]?\d+)(Hz|%)$', args.pitch)
            pitch_factor = 1.0
            if pitch_match:
                val = int(pitch_match.group(1))
                unit = pitch_match.group(2)
                if unit == 'Hz':
                    pitch_factor = 1.0 + (val / 150.0)
                else: # %
                    pitch_factor = 1.0 + (val / 100.0)
                pitch_factor = max(0.7, min(1.4, pitch_factor))

            # Parse rate factor
            rate_match = re.match(r'^([+-]?\d+)%$', args.rate)
            rate_factor = 1.0
            if rate_match:
                pct = int(rate_match.group(1))
                rate_factor = 1.0 + (pct / 100.0)
                rate_factor = max(0.5, min(2.0, rate_factor))

            # 피치나 속도 변경 사항이 있으면 리샘플링 및 속도 보정 조합 적용
            if pitch_factor != 1.0 or rate_factor != 1.0:
                filters.append("aresample=24000")
                filters.append(f"asetrate={int(24000 * pitch_factor)}")
                tempo_val = rate_factor / pitch_factor
                tempo_val = max(0.5, min(2.0, tempo_val))
                filters.append(f"atempo={tempo_val:.4f}")

        # Apply special voice effects
        if args.effect == "echo":
            filters.append("aecho=0.8:0.88:40:0.4")
        elif args.effect == "radio":
            filters.append("bandpass=f=1200:width_type=h:width=300")
        elif args.effect == "robot":
            filters.append("flanger=delay=10:depth=0.9:regen=70")
            
        if filters:
            filter_str = ",".join(filters)
            cmd = ["ffmpeg", "-y", "-i", temp_raw, "-af", filter_str, final_output]
            
            try:
                print(f"Applying voice effects chain ({filter_str}) via ffmpeg...")
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(temp_raw):
                    os.remove(temp_raw)
            except Exception as e:
                print(f"Warning: ffmpeg execution failed ({e}). Falling back to raw voice.", file=sys.stderr)
                if os.path.exists(temp_raw):
                    if os.path.exists(final_output):
                        try:
                            os.remove(final_output)
                        except Exception:
                            pass
                    os.rename(temp_raw, final_output)
        else:
            # 필터 리스트가 비어있는 경우 (예: 피치/속도 변경사항 없음) 원본 복사
            if os.path.exists(temp_raw) and temp_raw != final_output:
                if os.path.exists(final_output):
                    os.remove(final_output)
                os.rename(temp_raw, final_output)
        
    print(f"Success: {final_output}")

if __name__ == "__main__":
    asyncio.run(amain())
