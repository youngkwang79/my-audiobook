import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

// 한글 자모 자소 매핑용 간이 로마자 변환기
function romanizeHangeul(text: string): string {
  const choMap = [
    "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj",
    "ch", "k", "t", "p", "h"
  ];
  const jungMap = [
    "a", "ae", "ya", "yae", "eo", "e", "ye", "ye", "o", "wa", "wae", "oe",
    "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"
  ];
  const jongMap = [
    "", "g", "kk", "gs", "n", "nj", "nh", "d", "l", "lg", "lm", "lb", "ls",
    "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "ng", "j", "ch", "k", "t",
    "p", "h"
  ];

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = Math.floor(offset / 21 / 28);
      const jung = Math.floor((offset % (21 * 28)) / 28);
      const jong = offset % 28;
      result += choMap[cho] + jungMap[jung] + jongMap[jong];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result.replace(/[^a-z0-9]/g, "").slice(0, 30);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const {
      workId,
      outputDirPath,
      voice = "ko-KR-InJoonNeural",
      pitch = "+0Hz",
      rate = "+0%",
      voiceGuide = "",
      effect = "none",
      autoThumbnail = true,
      is_membership_only = false,
      releaseDateMode = "immediate",
      releaseDateStart = "",
      releaseDateInterval = "1day",
      runTts = true,
    } = payload;

    if (!workId || !outputDirPath) {
      return NextResponse.json({ error: "missing_required_params" }, { status: 400 });
    }

    const encoder = new TextEncoder();

    // ReadableStream 반환
    const stream = new ReadableStream({
      async start(controller) {
        function sendLog(type: string, message: string, data?: any) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type, message, data })}\n\n`)
            );
          } catch (e) {
            console.error("Stream enqueue error:", e);
          }
        }

        let tempTxtPath = "";
        let tempMp3Path = "";

        try {
          sendLog("info", "🚀 원터치 소설 집필 & 배포 자동화 파이프라인 가동!");
          
          let targetWorkId = workId;
          if (workId === "CREATE_FROM_FOLDER") {
            const folderName = path.basename(outputDirPath);
            const cleanName = folderName.replace(/^(무림북_대서사_|무림북_|무명_)/, "");
            targetWorkId = romanizeHangeul(cleanName);
            sendLog("info", `ℹ️ [작품 자동 생성] 폴더명에서 영문 고유 ID를 생성했습니다: ${targetWorkId}`);
          }

          // --- 1단계: 소설 다음 회차 집필 ---
          sendLog("info", `[1단계] novel_murim.py를 실행하여 다음 회차를 집필합니다. (폴더: ${outputDirPath})`);
          const scriptPath = path.join(process.cwd(), "novel_murim.py");
          
          const genArgs = ["--write-next", "--output-dir-path", outputDirPath];
          sendLog("debug", `명령어 실행: python novel_murim.py ${genArgs.join(" ")}`);
          
          const pythonProcess = spawn("python", [scriptPath, ...genArgs], {
            env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
          });

          let stdoutAcc = "";
          let lineBuffer = "";

          const novelGenPromise = new Promise<{
            chapter: number;
            title: string;
            file_path: string;
            novel_title: string;
            output_dir: string;
          }>((resolve, reject) => {
            pythonProcess.stdout.on("data", (chunk) => {
              const text = chunk.toString("utf8");
              stdoutAcc += text;
              lineBuffer += text;
              
              let lines = lineBuffer.split("\n");
              lineBuffer = lines.pop() || "";
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  sendLog("stdout", trimmed);
                }
              }
            });

            pythonProcess.stderr.on("data", (chunk) => {
              sendLog("stderr", chunk.toString("utf8").trim());
            });

            pythonProcess.on("close", (code) => {
              if (lineBuffer.trim()) {
                sendLog("stdout", lineBuffer.trim());
              }

              if (code !== 0) {
                reject(new Error(`소설 집필 프로세스가 종료 코드 ${code}로 실패했습니다.`));
                return;
              }

              const resultMatch = stdoutAcc.match(/\[GENERATION_RESULT\] (.*)/);
              if (!resultMatch) {
                reject(new Error("출력 결과에서 [GENERATION_RESULT] 마커를 찾지 못했습니다. 무료키 한도가 초과되었거나 응답 오류일 수 있습니다."));
                return;
              }

              try {
                const data = JSON.parse(resultMatch[1]);
                resolve(data);
              } catch (err) {
                reject(new Error(`결과 JSON 파싱 실패: ${err}`));
              }
            });
          });

          const genResult = await novelGenPromise;
          sendLog("success", `✨ [집필 완료] 제${genResult.chapter}화. <${genResult.title}>`);
          sendLog("info", `저장 경로: ${genResult.file_path}`);

          // --- 2단계: TTS 변환 & 3단계: R2 업로드 ---
          if (runTts) {
            sendLog("info", `[2단계] 오디오 변환을 시작합니다. (Voice: ${voice}, Pitch: ${pitch}, Rate: ${rate})`);
            const uniqueId = crypto.randomUUID();
            tempMp3Path = path.join(os.tmpdir(), `tts_${uniqueId}.mp3`);
            
            const ttsScriptPath = path.join(process.cwd(), "scripts", "tts_generator.py");
            const ttsArgs = [
              `--text-file=${genResult.file_path}`,
              `--voice=${voice}`,
              `--pitch=${pitch}`,
              `--rate=${rate}`,
              `--effect=${effect}`,
              `--output=${tempMp3Path}`
            ];
            if (voiceGuide) {
              ttsArgs.push(`--voice-guide=${voiceGuide}`);
            }

            sendLog("debug", `명령어 실행: python scripts/tts_generator.py ${ttsArgs.join(" ")}`);
            const ttsProcess = spawn("python", [ttsScriptPath, ...ttsArgs], {
              env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
            });

            let ttsLineBuffer = "";
            const ttsPromise = new Promise<void>((resolve, reject) => {
              ttsProcess.stdout.on("data", (chunk) => {
                const text = chunk.toString("utf8");
                ttsLineBuffer += text;
                let lines = ttsLineBuffer.split("\n");
                ttsLineBuffer = lines.pop() || "";
                for (const line of lines) {
                  if (line.trim()) sendLog("stdout", `[TTS] ${line.trim()}`);
                }
              });

              ttsProcess.stderr.on("data", (chunk) => {
                sendLog("stderr", `[TTS 에러] ${chunk.toString("utf8").trim()}`);
              });

              ttsProcess.on("close", (code) => {
                if (ttsLineBuffer.trim()) {
                  sendLog("stdout", `[TTS] ${ttsLineBuffer.trim()}`);
                }
                if (code === 0) {
                  resolve();
                } else {
                  reject(new Error(`TTS 변환 프로세스가 종료 코드 ${code}로 실패했습니다.`));
                }
              });
            });

            await ttsPromise;
            if (!fs.existsSync(tempMp3Path)) {
              throw new Error("TTS MP3 파일이 생성되지 않았습니다.");
            }
            sendLog("success", "🔊 [TTS 변환 완료] 오디오가 성공적으로 렌더링되었습니다.");

            // --- 3단계: R2 업로드 ---
            sendLog("info", "[3단계] Cloudflare R2 스토리지에 업로드하는 중...");
            const mp3Buffer = fs.readFileSync(tempMp3Path);
            const epNum = Number(genResult.chapter);
            const folder = isNaN(epNum) ? String(genResult.chapter) : String(epNum).padStart(3, "0");
            const r2Key = `${targetWorkId}/${folder}/01.MP3`;
            
            const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
            await s3.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: r2Key,
                Body: mp3Buffer,
                ContentType: "audio/mpeg"
              })
            );
            sendLog("success", `☁️ [R2 업로드 완료] Key: ${r2Key}`);
          } else {
            sendLog("info", "⏭️ [설정] 사용자의 옵션 선택으로 오디오(TTS) 변환 및 업로드 단계가 생략되었습니다.");
          }

          // --- 4단계 직전: 해당 작품(targetWorkId)이 DB에 존재하지 않으면 자동 생성 ---
          sendLog("info", `[4단계] 작품 정보를 데이터베이스에서 검사합니다. (ID: ${targetWorkId})`);
          const { data: existingWork, error: checkWorkErr } = await supabaseAdmin
            .from("works")
            .select("id")
            .eq("id", targetWorkId)
            .maybeSingle();

          if (checkWorkErr) {
            sendLog("stderr", `작품 검사 중 경고: ${checkWorkErr.message}`);
          }

          if (!existingWork) {
            sendLog("info", `🆕 작품(${targetWorkId})이 DB에 존재하지 않아 새로 등록합니다.`);
            
            let novelTitleVal = genResult.novel_title || "새 무협 소설";
            let novelIntroVal = "AI가 집필하는 새로운 정통 무협 대작 소설입니다.";
            let novelGenreVal = "정통무협";
            let totalEpsVal = 100;
            let freeEpsVal = 10;

            const planFile = path.join(genResult.output_dir, "00_🚨급전개방지_작품기획안🚨.json");
            if (fs.existsSync(planFile)) {
              try {
                const planObj = JSON.parse(fs.readFileSync(planFile, "utf8"));
                if (planObj.novel_title) novelTitleVal = planObj.novel_title;
                if (planObj.novel_intro) novelIntroVal = planObj.novel_intro;
                if (planObj.selected_style?.mood) {
                  novelGenreVal = planObj.selected_style.mood.includes("정통 무협") || planObj.selected_style.mood.includes("정통무협") ? "정통무협" : "무협";
                }
              } catch (e) {
                console.error("기획안 파일 읽기 실패:", e);
              }
            }

            const { error: insertWorkErr } = await supabaseAdmin
              .from("works")
              .insert({
                id: targetWorkId,
                title: novelTitleVal,
                description: novelIntroVal.slice(0, 500),
                subtitle: `[${novelGenreVal}]`,
                status: "준비중",
                total_episodes: totalEpsVal,
                free_episodes: freeEpsVal,
                episode_count: 0,
                badge: "신작"
              });

            if (insertWorkErr) {
              throw new Error(`새 작품 등록 실패: ${insertWorkErr.message}`);
            }
            sendLog("success", `💾 [작품 자동 생성 완료] "${novelTitleVal}"(이)가 성공적으로 데이터베이스에 생성되었습니다.`);
          }

          // --- 4단계: DB 등록 ---
          sendLog("info", "[4단계] 데이터베이스에 에피소드를 등록합니다.");
          
          let releaseDateStr = new Date().toISOString();
          if (releaseDateMode === "3days") {
            const calculatedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            releaseDateStr = calculatedDate.toISOString();
            sendLog("info", `[공개 예정일] 오디오 연성 시점 기준 3일 뒤 예약 설정: ${calculatedDate.toLocaleString("ko-KR")}`);
          } else if (releaseDateMode === "scheduled" && releaseDateStart) {
            const startBaseTime = new Date(releaseDateStart);
            const chapterNum = Number(genResult.chapter);
            const idx = isNaN(chapterNum) ? 0 : chapterNum;
            
            const calculatedDate = new Date(startBaseTime);
            if (releaseDateInterval === "1hour") {
              calculatedDate.setHours(startBaseTime.getHours() + idx);
            } else if (releaseDateInterval === "12hour") {
              calculatedDate.setHours(startBaseTime.getHours() + idx * 12);
            } else if (releaseDateInterval === "1day") {
              calculatedDate.setDate(startBaseTime.getDate() + idx);
            }
            releaseDateStr = calculatedDate.toISOString();
            sendLog("info", `[공개 예정일] 순차 예약 설정: ${calculatedDate.toLocaleString("ko-KR")} (시작일 기준 +${idx}번째 간격)`);
          } else {
            sendLog("info", `[공개 예정일] 즉시 공개 설정: ${new Date(releaseDateStr).toLocaleString("ko-KR")}`);
          }

          const { data: epData, error: epError } = await supabaseAdmin
            .from("episodes")
            .upsert({
              work_id: targetWorkId,
              id: String(genResult.chapter),
              title: genResult.title,
              locked: true,
              parts: 1,
              release_date: releaseDateStr,
              is_membership_only: is_membership_only
            })
            .select();
            
          if (epError) {
            throw new Error(`DB 등록 중 오류: ${epError.message}`);
          }

          // 작품 정보 통계 업데이트
          const { data: currentEpList } = await supabaseAdmin
            .from("episodes")
            .select("id")
            .eq("work_id", targetWorkId);
            
          if (currentEpList) {
            await supabaseAdmin
              .from("works")
              .update({ 
                episode_count: currentEpList.length,
                last_voice: voice,
                last_pitch: pitch,
                last_rate: rate
              })
              .eq("id", targetWorkId);
          }
          sendLog("success", `💾 [DB 등록 완료] 제${genResult.chapter}화 정보가 저장되었습니다.`);

          // --- 5단계: 썸네일 표지 생성 (오직 1화일 때만 자동 실행) ---
          if (genResult.chapter === 1 && autoThumbnail) {
            sendLog("info", "[5단계] 1화 감지: 소설 표지 일러스트 생성을 시작합니다.");
            
            // Gemini로 프롬프트 빌드
            sendLog("info", "Google Gemini를 사용하여 Imagen 4.0 전용 프롬프트를 작성 중...");
            const apiKey = process.env.GOOGLE_PAID_API_KEY;
            if (!apiKey) {
              throw new Error("소설 표지 프롬프트 생성을 위한 GOOGLE_PAID_API_KEY가 유실되었습니다.");
            }
            
            let synopsisText = "";
            const planFile = path.join(genResult.output_dir, "00_🚨급전개방지_작품기획안🚨.json");
            if (fs.existsSync(planFile)) {
              try {
                const planObj = JSON.parse(fs.readFileSync(planFile, "utf8"));
                synopsisText = planObj.novel_intro || planObj.overall_plot || "";
              } catch (e) {
                console.error("작품기획안 파일 읽기 실패:", e);
              }
            }

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const instructions = `You are an expert AI art prompt engineer for Google Imagen 4.
Given the Title and Synopsis of an East Asian martial arts / fantasy web novel, analyze the themes, characters, Robes/weapons, and mood to generate a highly detailed and visually descriptive English image prompt for Google Imagen 4.
The prompt must be in English and specify visual details (clothing, weapons, background, lighting, artistic style).

CRITICAL COMPOSITION:
1. The composition MUST be character-centric, styled like a professional movie poster focusing intensely on the main character.
2. Place a single main character (face/upper body close-up, or medium shot) as the absolute central focus of the image, dominating the composition with highly detailed features.
3. The background should be atmospheric (e.g. dramatic sky, mountains, energy effects) but secondary to the prominent central character.
4. Avoid wide landscape-focused shots where the character is small. The character must be the main, large focus of the image.

CRITICAL TEXT RULE:
The generated prompt must explicitly request a clean, textless, blank illustration. It must describe a pure character portrait without mentioning any title text, book covers, letters, signatures, characters, or words. Keep the prompt completely focused on visual imagery (e.g., "completely textless, clean character portrait, zero lettering, empty background, pure visual illustration").

The output MUST be only the raw prompt itself. Do not include any quotes, markdown formatting, or introductory phrases.

Novel Title: ${genResult.novel_title}
Novel Synopsis: ${synopsisText || "N/A"}`;

            const geminiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: instructions }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
              })
            });

            if (!geminiRes.ok) {
              throw new Error(`Gemini 프롬프트 생성 실패: ${await geminiRes.text()}`);
            }

            const geminiData = await geminiRes.json();
            const generatedPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            sendLog("info", `프롬프트 생성 완료: "${generatedPrompt}"`);

            // Imagen 4.0으로 이미지 바이트 생성 (유료키 최우선 적용)
            sendLog("info", "Google Imagen 4.0으로 표지 이미지 렌더링 중...");
            const paidApiKey = process.env.GOOGLE_PAID_API_KEY;
            if (!paidApiKey) {
              throw new Error("Imagen 4.0 이미지 생성을 위한 GOOGLE_PAID_API_KEY가 유실되었습니다.");
            }
            const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${paidApiKey}`;
            const enhancePrompt = `${generatedPrompt}, character-centric movie poster composition, close-up portrait of main character, clean graphic cover art, completely textless, zero text, zero letters, zero signatures, zero words, blank background, no font lettering, pure character portrait illustration, high quality digital painting, 4k`;

            const imagenRes = await fetch(imagenUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt: enhancePrompt }],
                parameters: { sampleCount: 1, aspectRatio: "3:4", outputMimeType: "image/jpeg" }
              })
            });

            if (!imagenRes.ok) {
              throw new Error(`Imagen 4.0 이미지 생성 실패: ${await imagenRes.text()}`);
            }

            const imagenData = await imagenRes.json();
            const prediction = imagenData.predictions?.[0];
            let imageBytes = prediction?.bytesBase64Encoded || prediction?.imageBytes || prediction?.image;
            if (typeof imageBytes === "object" && imageBytes?.imageBytes) {
              imageBytes = imageBytes.imageBytes;
            }

            if (!imageBytes) {
              throw new Error("Imagen 이미지 바이트가 없습니다.");
            }

            const imageBuffer = Buffer.from(imageBytes, "base64");
            const timestamp = Date.now();
            const publicThumbnailsDir = path.join(process.cwd(), "public", "thumbnails");
            if (!fs.existsSync(publicThumbnailsDir)) {
              fs.mkdirSync(publicThumbnailsDir, { recursive: true });
            }
            const localFileName = `${targetWorkId}_${timestamp}.png`;
            const localFilePath = path.join(publicThumbnailsDir, localFileName);
            
            // 로컬 디스크 및 R2에 base 썸네일 백업 저장
            fs.writeFileSync(localFilePath, imageBuffer);
            
            const r2ThumbKey = `thumbnails/${targetWorkId}_${timestamp}.png`;
            await s3.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: r2ThumbKey,
                Body: imageBuffer,
                ContentType: "image/png"
              })
            );

            // DB 업데이트
            const relativeUrl = `/api/thumbnails/${localFileName}`;
            await supabaseAdmin
              .from("works")
              .update({ thumbnail_url: relativeUrl })
              .eq("id", targetWorkId);

            sendLog("success", `🎨 [표지 생성 성공] 새 표지가 설정되었습니다: ${relativeUrl}`);
          }

          // 최종 완료 처리
          sendLog("done", "🎉 [전과정 완료] 소설 집필, 오디오 변환, R2 배포 및 DB 동기화가 모두 성공하였습니다!", {
            chapter: genResult.chapter,
            title: genResult.title,
            workId: targetWorkId
          });

        } catch (err: any) {
          sendLog("error", `자동화 진행 중 치명적인 오류 발생: ${err.message}`);
        } finally {
          // 임시 리소스 해제
          try {
            if (tempTxtPath && fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
            if (tempMp3Path && fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
          } catch (e) {
            console.error("Cleanup error in automation api route:", e);
          }
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });

  } catch (error: any) {
    console.error("Automation API Pipeline Error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
