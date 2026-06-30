import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// Helper function to run a command as a promise
function runTtsScript(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Determine the scripts path relative to the workspace root
    // Usually, the process runs in the project root
    const scriptPath = path.join(process.cwd(), "scripts", "tts_generator.py");
    
    console.log(`Running python scripts/tts_generator.py with args:`, args);
    const pythonProcess = spawn("python", [scriptPath, ...args], {
      env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
    });
    
    let stdout = "";
    let stderr = "";
    
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        console.error(`Python script exited with code ${code}. Stderr: ${stderr}`);
        reject(new Error(stderr || `Python exit code: ${code}`));
      }
    });
  });
}

function splitTextIntoParts(text: string, maxLen: number = 3000): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let currentPart: string[] = [];
  let currentLength = 0;

  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (paragraph.length === 0) continue;

    if (currentLength + paragraph.length + (currentPart.length > 0 ? 1 : 0) > maxLen) {
      if (currentPart.length > 0) {
        parts.push(currentPart.join("\n"));
        currentPart = [];
        currentLength = 0;
      }

      if (paragraph.length > maxLen) {
        // Safe sentence splitting without lookbehind
        const sentences = paragraph.replace(/([.!?])\s+/g, "$1|").split("|");
        for (let sentence of sentences) {
          sentence = sentence.trim();
          if (sentence.length === 0) continue;

          if (currentLength + sentence.length + (currentPart.length > 0 ? 1 : 0) > maxLen) {
            if (currentPart.length > 0) {
              parts.push(currentPart.join(" "));
              currentPart = [];
              currentLength = 0;
            }

            if (sentence.length > maxLen) {
              let offset = 0;
              while (offset < sentence.length) {
                const chunk = sentence.substring(offset, offset + maxLen);
                parts.push(chunk);
                offset += maxLen;
              }
            } else {
              currentPart.push(sentence);
              currentLength = sentence.length;
            }
          } else {
            currentPart.push(sentence);
            currentLength += sentence.length + (currentPart.length > 1 ? 1 : 0);
          }
        }
      } else {
        currentPart.push(paragraph);
        currentLength = paragraph.length;
      }
    } else {
      currentPart.push(paragraph);
      currentLength += paragraph.length + (currentPart.length > 1 ? 1 : 0);
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart.join("\n"));
  }

  return parts;
}

export async function POST(req: Request) {
  let tempTxtPath = "";
  let tempMp3Path = "";
  const createdTempFiles: string[] = [];
  
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

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. Payload 파싱
    const payload = await req.json().catch(() => ({}));
    const { 
      text, 
      voice = "ko-KR-InJoonNeural", 
      pitch = "+0Hz", 
      rate = "+0%", 
      preview = false, 
      workId, 
      episodeId, 
      title, 
      locked = true, 
      releaseDate,
      effect = "none",
      is_membership_only = false,
      voiceGuide,
      uploadR2AndDb = true,
      downloadLocal = false
    } = payload;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }

    // 3. 임시 파일 경로 설정
    const uniqueId = crypto.randomUUID();
    tempMp3Path = path.join(os.tmpdir(), `tts_${uniqueId}.mp3`);
    tempTxtPath = path.join(os.tmpdir(), `tts_${uniqueId}.txt`);

    // 4. 미리보기 (Preview) 처리
    if (preview) {
      // 미리보기는 최대 200글자만 오디오로 변환하여 딜레이 최소화
      const previewText = text.substring(0, 200);
      fs.writeFileSync(tempTxtPath, previewText, "utf-8");
      
      const args = [
        `--text-file=${tempTxtPath}`,
        `--voice=${voice}`,
        `--pitch=${pitch}`,
        `--rate=${rate}`,
        `--effect=${effect}`,
        `--output=${tempMp3Path}`
      ];
      
      if (voiceGuide) {
        args.push(`--voice-guide=${voiceGuide}`);
      }
      
      await runTtsScript(args);
      
      if (!fs.existsSync(tempMp3Path)) {
        throw new Error("TTS MP3 file was not generated");
      }
      
      // MP3 바이너리 데이터 읽기
      const mp3Buffer = fs.readFileSync(tempMp3Path);
      
      // 임시 파일 삭제
      try {
        if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
        if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
      } catch (e) {
        console.error("Error cleaning up preview temp files:", e);
      }
      
      // 오디오 스트림 응답 반환
      return new Response(mp3Buffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(mp3Buffer.length)
        }
      });
    }

    // 5. 전체 생성 및 업로드 처리
    if (!workId || !episodeId || !title || (!releaseDate && uploadR2AndDb)) {
      return NextResponse.json({ error: "missing_required_metadata" }, { status: 400 });
    }

    // 오디오에 제목은 함께 낭독하되, 흐름을 깨는 회차 표시(제 몇화)는 낭독에서 제외합니다.
    let fullText = text.trim();
    const cleanTitle = title.trim();

    // 1. 본문 첫 머리에 들어 있는 "제N화 - " 또는 "[제N화. ]" 등 회차 번호 낭독 기호 제거
    fullText = fullText.replace(/^\[?제\s*\d+\s*화\s*[-.]\s*/, "");
    fullText = fullText.replace(/^\[?제\s*\d+\s*화\s+/, "");
    // 대괄호 닫는 기호가 남아있다면 제거
    if (fullText.startsWith(cleanTitle) && fullText.substring(cleanTitle.length).startsWith("]")) {
      fullText = cleanTitle + fullText.substring(cleanTitle.length + 1);
    }

    // 2. 제목(cleanTitle)만 본문 서두에 들어가도록 추가 (이미 제목이 본문 첫 부분에 정규적으로 들어가 있지 않은 경우만)
    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9가-힣]/g, "");
    if (cleanTitle && !normalize(fullText.substring(0, 150)).includes(normalize(cleanTitle))) {
      fullText = `${cleanTitle}.\n\n${fullText}`;
    }

    // 텍스트 분할 (최대 3000글자 기준)
    const maxCharsPerPart = 3000;
    const textParts = splitTextIntoParts(fullText, maxCharsPerPart);
    const totalParts = textParts.length;
    console.log(`TTS target text length: ${fullText.length}. Splitting into ${totalParts} parts.`);

    const epNum = Number(episodeId);
    const folder = isNaN(epNum) ? String(episodeId) : String(epNum).padStart(3, "0");
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    let firstR2Key = "";
    const generatedPartsBase64: { partNum: number; base64: string }[] = [];

    for (let i = 0; i < totalParts; i++) {
      const partText = textParts[i];
      const partNum = i + 1;
      const partPadded = String(partNum).padStart(2, "0");
      
      const partTxtPath = path.join(os.tmpdir(), `tts_${uniqueId}_p${partPadded}.txt`);
      const partMp3Path = path.join(os.tmpdir(), `tts_${uniqueId}_p${partPadded}.mp3`);
      
      createdTempFiles.push(partTxtPath, partMp3Path);
      
      fs.writeFileSync(partTxtPath, partText, "utf-8");
      
      const args = [
        `--text-file=${partTxtPath}`,
        `--voice=${voice}`,
        `--pitch=${pitch}`,
        `--rate=${rate}`,
        `--effect=${effect}`,
        `--output=${partMp3Path}`
      ];
      
      if (voiceGuide) {
        args.push(`--voice-guide=${voiceGuide}`);
      }
      
      console.log(`Generating TTS part ${partNum}/${totalParts}...`);
      await runTtsScript(args);
      
      if (!fs.existsSync(partMp3Path)) {
        throw new Error(`TTS MP3 file was not generated for part ${partNum}`);
      }
      
      const mp3Buffer = fs.readFileSync(partMp3Path);
      const r2Key = `${workId}/${folder}/${partPadded}.MP3`;
      
      if (partNum === 1) {
        firstR2Key = r2Key;
      }
      
      if (downloadLocal) {
        generatedPartsBase64.push({
          partNum,
          base64: mp3Buffer.toString("base64")
        });
      }

      if (uploadR2AndDb) {
        console.log(`Uploading part ${partNum}/${totalParts} to R2: ${r2Key}...`);
        // Cloudflare R2에 업로드
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: r2Key,
            Body: mp3Buffer,
            ContentType: "audio/mpeg"
          })
        );
      }
      
      // 개별 파트 생성 즉시 임시 파일 정리
      try {
        if (fs.existsSync(partTxtPath)) fs.unlinkSync(partTxtPath);
        if (fs.existsSync(partMp3Path)) fs.unlinkSync(partMp3Path);
      } catch (e) {
        console.error(`Error cleaning up part temp files:`, e);
      }
    }
    
    let epData: any[] | null = null;

    if (uploadR2AndDb) {
      // Supabase에 에피소드 데이터 upsert
      const { data: upsertData, error: epError } = await supabaseAdmin
        .from("episodes")
        .upsert({
          work_id: workId,
          id: String(episodeId),
          title: title,
          locked: locked,
          parts: totalParts,
          release_date: new Date(releaseDate).toISOString(),
          is_membership_only: is_membership_only
        })
        .select();
        
      if (epError) {
        throw new Error(`DB upsert failed: ${epError.message}`);
      }
      
      epData = upsertData;
      
      // 작품의 총 에피소드 수 및 마지막 목소리 설정 업데이트
      const { data: currentEpList } = await supabaseAdmin
        .from("episodes")
        .select("id")
        .eq("work_id", workId);
        
      if (currentEpList) {
        await supabaseAdmin
          .from("works")
          .update({ 
            episode_count: currentEpList.length,
            last_voice: voice,
            last_pitch: pitch,
            last_rate: rate
          })
          .eq("id", workId);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      r2Key: uploadR2AndDb ? firstR2Key : undefined, 
      episode: uploadR2AndDb ? epData?.[0] : { id: episodeId, title: title, parts: totalParts },
      parts: downloadLocal ? generatedPartsBase64 : undefined
    });
  } catch (error: any) {
    console.error("TTS API Route Error:", error);
    
    // 에러 발생 시 임시 파일 정리
    try {
      if (tempTxtPath && fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
      if (tempMp3Path && fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
    } catch (e) {
      console.error("Error cleaning up temp files in catch block:", e);
    }
    
    return NextResponse.json({ 
      error: "server_error", 
      details: error.message 
    }, { status: 500 });
  }
}
