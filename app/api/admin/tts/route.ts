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
    const pythonProcess = spawn("python", [scriptPath, ...args]);
    
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

export async function POST(req: Request) {
  let tempTxtPath = "";
  let tempMp3Path = "";
  
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
      releaseDate 
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
        `--output=${tempMp3Path}`
      ];
      
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
    if (!workId || !episodeId || !title || !releaseDate) {
      return NextResponse.json({ error: "missing_required_metadata" }, { status: 400 });
    }

    // 전체 본문 텍스트 파일 저장
    fs.writeFileSync(tempTxtPath, text, "utf-8");
    
    const args = [
      `--text-file=${tempTxtPath}`,
      `--voice=${voice}`,
      `--pitch=${pitch}`,
      `--rate=${rate}`,
      `--output=${tempMp3Path}`
    ];
    
    await runTtsScript(args);
    
    if (!fs.existsSync(tempMp3Path)) {
      throw new Error("TTS MP3 file was not generated");
    }
    
    const mp3Buffer = fs.readFileSync(tempMp3Path);
    
    // R2 키 설정 (예: cheonmujin/001/01.mp3)
    const epNum = Number(episodeId);
    const folder = isNaN(epNum) ? String(episodeId) : String(epNum).padStart(3, "0");
    const r2Key = `${workId}/${folder}/01.mp3`; // 기본 01 파트로 업로드
    
    const bucketName = process.env.R2_BUCKET_NAME || "murimbook-audio";
    
    // Cloudflare R2에 업로드
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: mp3Buffer,
        ContentType: "audio/mpeg"
      })
    );
    
    // Supabase에 에피소드 데이터 upsert
    const { data: epData, error: epError } = await supabaseAdmin
      .from("episodes")
      .upsert({
        work_id: workId,
        id: String(episodeId),
        title: title,
        locked: locked,
        parts: 1,
        release_date: new Date(releaseDate).toISOString()
      })
      .select();
      
    if (epError) {
      throw new Error(`DB upsert failed: ${epError.message}`);
    }
    
    // 작품의 총 에피소드 수 업데이트
    const { data: currentEpList } = await supabaseAdmin
      .from("episodes")
      .select("id")
      .eq("work_id", workId);
      
    if (currentEpList) {
      await supabaseAdmin
        .from("works")
        .update({ episode_count: currentEpList.length })
        .eq("id", workId);
    }
    
    // 임시 파일 정리
    try {
      if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
      if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
    } catch (e) {
      console.error("Error cleaning up full temp files:", e);
    }
    
    return NextResponse.json({ 
      success: true, 
      r2Key, 
      episode: epData?.[0] 
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
