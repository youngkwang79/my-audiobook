import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function runScript(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(" ")}`);
    const processInstance = spawn(command, args, {
      env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
      cwd: process.cwd()
    });
    
    let stdout = "";
    let stderr = "";
    
    processInstance.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    processInstance.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    processInstance.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        console.error(`Script failed with code ${code}. Stderr: ${stderr}\nStdout: ${stdout}`);
        reject(new Error(stderr || stdout || `Exit code: ${code}`));
      }
    });
  });
}

function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ \-_]/g, "").trim().replace(/\s+/g, "_");
}

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인 (로컬 호스팅 환경에서는 로컬 테스트 편의성을 위해 유연한 인증 제공)
    const host = req.headers.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("192.168.");
    
    let isAdmin = false;
    
    if (isLocalhost) {
      isAdmin = true; // 로컬 테스트 시 인증 무사 통과
    } else {
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
      isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. Payload 파싱
    const body = await req.json().catch(() => ({}));
    const { action, query, keyword, title, extraFact } = body;

    if (!action) {
      return NextResponse.json({ error: "missing_action" }, { status: 400 });
    }

    // --- Action: Trends (Fetch Google Trends) ---
    if (action === "trends") {
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "0_get_google_trends.py");
      await runScript("python", [scriptPath]);
      
      const outputPath = path.join(process.cwd(), "content-factory", "output", "google_daily_trends.json");
      if (!fs.existsSync(outputPath)) {
        throw new Error("Google trends file was not generated");
      }
      
      const rawData = fs.readFileSync(outputPath, "utf8");
      return NextResponse.json(JSON.parse(rawData));
    }

    // --- Action: Search (Perplexity) ---
    if (action === "search") {
      if (!query) return NextResponse.json({ error: "missing_query" }, { status: 400 });
      
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "1_search_trend.py");
      await runScript("python", [scriptPath, "--query", query]);
      
      const sanitizedQuery = sanitizeKeyword(query);
      const outputPath = path.join(process.cwd(), "content-factory", "output", `trends_${sanitizedQuery}.json`);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error("Trend output file was not generated");
      }
      
      const rawData = fs.readFileSync(outputPath, "utf8");
      return NextResponse.json(JSON.parse(rawData));
    }

    // --- Action: Generate (Claude/OpenAI Blog Writer) ---
    if (action === "generate") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "2_generate_blog.py");
      const args = ["--keyword", keyword];
      if (title) {
        args.push("--title", title);
      }
      if (extraFact) {
        args.push("--extra_fact", extraFact);
      }
      
      await runScript("python", [scriptPath, ...args]);
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const postPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword, "blog_post.md");
      
      if (!fs.existsSync(postPath)) {
        throw new Error("Blog post file was not generated");
      }
      
      const blogContent = fs.readFileSync(postPath, "utf8");
      return NextResponse.json({ success: true, keyword: sanitizedKeyword, markdown: blogContent });
    }

    // --- Action: Refactor (Shorts, Card News, X Thread) ---
    if (action === "refactor") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "3_refactor_post.py");
      
      await runScript("python", [scriptPath, "--dir", sanitizedKeyword]);
      
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      // 파일 읽기
      const shortsPath = path.join(folderPath, "shorts_script.txt");
      const cardPath = path.join(folderPath, "card_news.json");
      const cardRawPath = path.join(folderPath, "card_news_raw.txt");
      const xPath = path.join(folderPath, "x_thread.txt");
      
      const shorts = fs.existsSync(shortsPath) ? fs.readFileSync(shortsPath, "utf8") : "";
      const xThread = fs.existsSync(xPath) ? fs.readFileSync(xPath, "utf8") : "";
      
      let cardNews = null;
      if (fs.existsSync(cardPath)) {
        try {
          cardNews = JSON.parse(fs.readFileSync(cardPath, "utf8"));
        } catch (e) {
          console.error("JSON parsing error for card news:", e);
        }
      }
      if (!cardNews && fs.existsSync(cardRawPath)) {
        cardNews = fs.readFileSync(cardRawPath, "utf8");
      }
      
      return NextResponse.json({
        success: true,
        shorts,
        cardNews,
        xThread
      });
    }

    // --- Action: Publish (WordPress REST Uploader) ---
    if (action === "publish") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "4_publish_wp.js");
      const args = ["--dir", sanitizedKeyword];
      if (title) {
        args.push("--title", title);
      }
      
      const outputLog = await runScript("node", [scriptPath, ...args]);
      
      // 로그 결과 분석하여 ID 및 링크 추출
      const idMatch = outputLog.match(/글 ID: (\d+)/);
      const linkMatch = outputLog.match(/편집 페이지 링크: (https?:\/\/[^\s]+)/);
      
      return NextResponse.json({
        success: true,
        log: outputLog,
        postId: idMatch ? idMatch[1] : null,
        editLink: linkMatch ? linkMatch[1] : null
      });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error: any) {
    console.error("Content Factory API Route Error:", error);
    return NextResponse.json({ 
      error: "server_error", 
      details: error.message 
    }, { status: 500 });
  }
}
