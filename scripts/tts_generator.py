import asyncio
import argparse
import sys
import os
import edge_tts
import edge_tts.communicate
import re

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

def preprocess_content_to_ssml_body(content, boosted_pitch, default_pitch=None, default_rate=None, boost_questions=True, use_break=True):
    # Normalize quotes
    content = content.replace("“", '"').replace("”", '"')
    content = content.replace("‘", "'").replace("’", "'")
    
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
        
    def xml_escape(s):
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")

    body_parts = []
    for s in sentences:
        is_question = s.strip().endswith('?') and boost_questions
        escaped_s = xml_escape(s)
        
        if use_break:
            # Apply pauses on ellipses U+2026 or double+ dots
            escaped_s = re.sub(r'\.{2,}|…', '<break time="500ms"/>', escaped_s)
            # Dialogue pause (700ms after dialogue quote ends)
            escaped_s = re.sub(r'&quot;(.*?)&quot;', r'&quot;\1&quot;<break time="700ms"/>', escaped_s)
        
        if is_question:
            if default_rate:
                body_parts.append(f"<prosody pitch='{boosted_pitch}' rate='{default_rate}'>{escaped_s}</prosody>")
            else:
                body_parts.append(f"<prosody pitch='{boosted_pitch}'>{escaped_s}</prosody>")
        else:
            if (default_pitch or default_rate) and boost_questions:
                attrs = []
                if default_pitch:
                    attrs.append(f"pitch='{default_pitch}'")
                if default_rate:
                    attrs.append(f"rate='{default_rate}'")
                body_parts.append(f"<prosody {' '.join(attrs)}>{escaped_s}</prosody>")
            else:
                body_parts.append(escaped_s)
            
    return "".join(body_parts)

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
    api_key = os.environ.get("GOOGLE_PAID_API_KEY")
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
                            if key.strip() == "GOOGLE_PAID_API_KEY":
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
    parser.add_argument("--voice-guide", help="Voice guide system instructions for audio modality")
    args = parser.parse_args()
    
    # Map old/incorrect voice name to the correct Microsoft Edge TTS name
    if args.voice == "ko-KR-HyunsuNeural":
        args.voice = "ko-KR-HyunsuMultilingualNeural"

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
    
    # 1. Determine voice engine
    openai_voices = ["onyx", "alloy", "echo", "fable", "nova", "shimmer"]
    google_voices = ["ko-kr-neural2-b", "ko-kr-neural2-c", "ko-kr-neural2-a", "ko-kr-wavenet-d", "ko-kr-wavenet-b"]
    is_openai = args.voice.lower() in openai_voices
    is_google = args.voice.lower() in google_voices

    is_pitch_rate_modified = (args.pitch != "+0Hz" or args.rate != "+0%")
    has_filters = (args.effect and args.effect != "none") or is_pitch_rate_modified

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
        
        if args.voice_guide:
            import base64
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-audio-mini",
                "modalities": ["text", "audio"],
                "audio": {
                    "voice": args.voice.lower(),
                    "format": "mp3"
                },
                "messages": [
                    {
                        "role": "system",
                        "content": args.voice_guide
                    },
                    {
                        "role": "user",
                        "content": f"Please read the following text aloud word-for-word, EXACTLY as written. NEVER alter, skip, or add any words, dialogues, or explanations. Do not output any chat response or commentary—ONLY read this text:\n\n{content}"
                    }
                ]
            }
            
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode("utf-8"), 
                headers=headers, 
                method="POST"
            )
            
            try:
                print(f"Calling OpenAI Chat Completions Audio API for voice '{args.voice}' with voice guide...")
                with urllib.request.urlopen(req) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    if "choices" in resp_data and len(resp_data["choices"]) > 0:
                        audio_data = resp_data["choices"][0]["message"]["audio"]["data"]
                        with open(temp_raw, "wb") as f:
                            f.write(base64.b64decode(audio_data))
                    else:
                        print(f"Error: OpenAI response did not contain audio data: {resp_data}", file=sys.stderr)
                        sys.exit(1)
            except Exception as e:
                if hasattr(e, "read"):
                    try:
                        print(f"Response body: {e.read().decode('utf-8')}", file=sys.stderr)
                    except Exception:
                        pass
                print(f"Error calling OpenAI Chat Completions Audio API: {e}", file=sys.stderr)
                sys.exit(1)
        else:
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
            print("Error: GOOGLE_PAID_API_KEY is not set in environment or .env.local", file=sys.stderr)
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
                
        # SSML formatting
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
                
        body_content = preprocess_content_to_ssml_body(content, "+0Hz")
        gcp_ssml = f"<speak>{body_content}</speak>"
        
        payload = {
            "input": {
                "ssml": gcp_ssml
            },
            "voice": {
                "languageCode": lang_code,
                "name": gcp_voice_name
            },
            "audioConfig": {
                "audioEncoding": "MP3"
            }
        }
        
        payload["audioConfig"]["speakingRate"] = 1.0
        
        payload["audioConfig"]["pitch"] = 0.0
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        
        try:
            print(f"Calling Google Cloud TTS API for voice '{gcp_voice_name}' with SSML (Rate: {rate_val}, Pitch semitones: {pitch_semitones})...")
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
        # Standard Microsoft Edge TTS Generation using SSML
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
                
        body_content = preprocess_content_to_ssml_body(content, boosted_pitch="+0Hz", boost_questions=False, use_break=False)
        
        ssml = (
            "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
            f"<voice name='{args.voice}'>"
            f"<prosody pitch='+0Hz' rate='+0%'>"
            f"{body_content}"
            f"</prosody>"
            f"</voice>"
            "</speak>"
        )
        
        print("Generated Custom Edge TTS SSML...")
        print("SSML:", ssml)
        communicate = edge_tts.Communicate(text="dummy", voice=args.voice, pitch="+0Hz", rate="+0%")
        communicate.texts = [ssml]
        
        try:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await communicate.save(temp_raw)
                    break
                except Exception as e:
                    print(f"Edge TTS connection attempt {attempt + 1} failed: {e}", file=sys.stderr)
                    if attempt == max_retries - 1:
                        raise e
                    await asyncio.sleep(2)
        except Exception as e:
            print(f"Error calling Edge TTS: {e}", file=sys.stderr)
            sys.exit(1)

    if has_filters:
        import subprocess
        # Build filter chain
        filters = []

        # 모든 음성에 대해 ffmpeg로 음높이/속도 조절 적용 (UI의 미리보기와 동일한 효과 제공)
        if True:
            # Parse pitch factor
            pitch_match = re.match(r'^([+-]?\d+)(Hz|%)$', args.pitch)
            pitch_factor = 1.0
            if pitch_match:
                val = int(pitch_match.group(1))
                unit = pitch_match.group(2)
                # Hz나 % 단위 모두 더 강하게 반영되도록 분모를 줄임 (기존 150, 100 -> 60)
                pitch_factor = 1.0 + (val / 60.0)
                pitch_factor = max(0.6, min(1.5, pitch_factor))

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
            
        # Check if local ffmpeg.exe exists in scripts/ or root directory
        ffmpeg_bin = "ffmpeg"
        local_paths = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg.exe"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ffmpeg.exe"),
            os.path.join(os.getcwd(), "ffmpeg.exe"),
            os.path.join(os.getcwd(), "bin", "ffmpeg.exe"),
        ]
        for p in local_paths:
            if os.path.exists(p):
                ffmpeg_bin = p
                break

        if filters:
            filter_str = ",".join(filters)
            cmd = [ffmpeg_bin, "-y", "-i", temp_raw, "-af", filter_str, final_output]
            
            try:
                print(f"Applying voice effects chain ({filter_str}) via ffmpeg ({ffmpeg_bin})...")
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
