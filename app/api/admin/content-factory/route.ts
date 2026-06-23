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
        reject(new Error(`ExitCode: ${code} | Stdout: ${stdout.trim()} | Stderr: ${stderr.trim()}`));
      }
    });
  });
}

async function uploadBase64ToWordPress(base64Data: string, fileName: string): Promise<string | null> {
  const wpUrl = process.env.WP_URL;
  const username = process.env.WP_ADMIN_USERNAME;
  const appPassword = process.env.WP_APPLICATION_PASSWORD;
  
  if (!wpUrl || !username || !appPassword) {
    return null;
  }
  
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Disposition": `attachment; filename=${safeFileName}`,
        "Content-Type": "image/png"
      },
      body: buffer
    });

    if (res.status === 201) {
      const data = await res.json();
      return data.source_url;
    } else {
      console.error("WP media upload response status:", res.status, await res.text());
    }
  } catch (err: any) {
    console.error("WordPress media upload helper error:", err.message);
  }
  return null;
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
    const { action, query, keyword, title, extraFact, wpThumbnailBase64, wpContentImageBase64, generatedMarkdown, bloggerPost, bloggerThumbnailBase64, bloggerContentImageBase64, topRankPostSummary } = body;

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
      if (topRankPostSummary) {
        args.push("--top_rank_post_summary", topRankPostSummary);
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
      const bloggerPath = path.join(folderPath, "blogger_post.txt");
      const snsCaptionPath = path.join(folderPath, "sns_caption.txt");
      
      const shorts = fs.existsSync(shortsPath) ? fs.readFileSync(shortsPath, "utf8") : "";
      const xThread = fs.existsSync(xPath) ? fs.readFileSync(xPath, "utf8") : "";
      const bloggerPost = fs.existsSync(bloggerPath) ? fs.readFileSync(bloggerPath, "utf8") : "";
      const snsCaption = fs.existsSync(snsCaptionPath) ? fs.readFileSync(snsCaptionPath, "utf8") : "";
      
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
        xThread,
        bloggerPost,
        snsCaption
      });
    }

    // --- Action: Publish (WordPress REST Uploader) ---
    if (action === "publish") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      if (generatedMarkdown) {
        fs.writeFileSync(path.join(folderPath, "blog_post.md"), generatedMarkdown, "utf8");
      }
      
      if (wpThumbnailBase64) {
        const buffer = Buffer.from(wpThumbnailBase64, "base64");
        fs.writeFileSync(path.join(folderPath, "custom_thumbnail.png"), buffer);
      }

      if (wpContentImageBase64) {
        const buffer = Buffer.from(wpContentImageBase64, "base64");
        fs.writeFileSync(path.join(folderPath, "custom_content_image.png"), buffer);
      }
      
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "4_publish_wp.js");
      const args = [`--dir=${sanitizedKeyword}`];
      if (title) {
        args.push(`--title=${title}`);
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

    // --- Action: Create Video (Render Card News Slides to Shorts Video via FFmpeg) ---
    if (action === "create-video") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      const { slides } = body;
      if (!slides || !Array.isArray(slides) || slides.length === 0) {
        return NextResponse.json({ error: "missing_slides" }, { status: 400 });
      }

      const sanitizedKeyword = sanitizeKeyword(keyword);
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // 1. 받은 모든 슬라이드 Base64 이미지를 로컬에 디스크 파일로 쓰기
      slides.forEach((base64Data: string, idx: number) => {
        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(path.join(folderPath, `slide_${idx + 1}.png`), buffer);
      });

      // 2. 동영상 생성 스크립트 실행
      const scriptPath = path.join(process.cwd(), "content-factory", "scripts", "5_create_shorts.js");
      const outputLog = await runScript("node", [scriptPath, `--dir=${sanitizedKeyword}`]);

      const outputVideoPath = path.join(folderPath, "reels_shorts.mp4");
      if (fs.existsSync(outputVideoPath)) {
        return NextResponse.json({
          success: true,
          message: "Shorts video created successfully via FFmpeg!",
          log: outputLog
        });
      } else {
        return NextResponse.json({
          error: "ffmpeg_render_failed",
          details: outputLog
        }, { status: 500 });
      }
    }

    // --- Action: Send to n8n Webhook ---
    if (action === "n8n") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      const postPath = path.join(folderPath, "blog_post.md");
      const seoPath = path.join(folderPath, "seo_meta.json");
      const shortsPath = path.join(folderPath, "shorts_script.txt");
      const cardPath = path.join(folderPath, "card_news.json");
      const xPath = path.join(folderPath, "x_thread.txt");
      const bloggerPath = path.join(folderPath, "blogger_post.txt");
      const snsCaptionPath = path.join(folderPath, "sns_caption.txt");
      
      if (!fs.existsSync(postPath)) {
        return NextResponse.json({ error: "blog_post_not_generated" }, { status: 400 });
      }
      
      if (bloggerPost) {
        fs.writeFileSync(bloggerPath, bloggerPost, "utf8");
      }

      if (bloggerThumbnailBase64) {
        const buffer = Buffer.from(bloggerThumbnailBase64, "base64");
        fs.writeFileSync(path.join(folderPath, "custom_blogger_thumbnail.png"), buffer);
        try {
          const url = await uploadBase64ToWordPress(bloggerThumbnailBase64, `${sanitizedKeyword}_blogger_thumb.png`);
          if (url) {
            fs.writeFileSync(path.join(folderPath, "custom_blogger_thumbnail_url.txt"), url, "utf8");
            console.log(`[✔] Blogger Thumbnail auto-uploaded to WP for hosting: ${url}`);
          }
        } catch (e: any) {
          console.error("Blogger Thumbnail auto-upload error:", e.message);
        }
      }

      if (bloggerContentImageBase64) {
        const buffer = Buffer.from(bloggerContentImageBase64, "base64");
        fs.writeFileSync(path.join(folderPath, "custom_blogger_content_image.png"), buffer);
        try {
          const url = await uploadBase64ToWordPress(bloggerContentImageBase64, `${sanitizedKeyword}_blogger_content.png`);
          if (url) {
            fs.writeFileSync(path.join(folderPath, "custom_blogger_content_image_url.txt"), url, "utf8");
            console.log(`[✔] Blogger Content Image auto-uploaded to WP for hosting: ${url}`);
          }
        } catch (e: any) {
          console.error("Blogger Content Image auto-upload error:", e.message);
        }
      }

      const contentMarkdown = fs.readFileSync(postPath, "utf8");
      
      let seoMeta: any = {};
      if (fs.existsSync(seoPath)) {
        try {
          seoMeta = JSON.parse(fs.readFileSync(seoPath, "utf8"));
        } catch (e) {}
      }
      
      const shorts = fs.existsSync(shortsPath) ? fs.readFileSync(shortsPath, "utf8") : "";
      const xThread = fs.existsSync(xPath) ? fs.readFileSync(xPath, "utf8") : "";
      const snsCaption = fs.existsSync(snsCaptionPath) ? fs.readFileSync(snsCaptionPath, "utf8") : "";
      let cardNews = null;
      if (fs.existsSync(cardPath)) {
        try {
          cardNews = JSON.parse(fs.readFileSync(cardPath, "utf8"));
        } catch (e) {}
      }
      
      const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/murimbook-blog";
      
      console.log(`Sending post data to n8n Webhook: ${n8nUrl}`);
      
      let finalBloggerPost = bloggerPost || (fs.existsSync(bloggerPath) ? fs.readFileSync(bloggerPath, "utf8") : "");
      
      // 1. 본문 중간에 들어가는 이미지 (표 대체 등)
      let contentImgTag = "";
      const bloggerImgPath = path.join(folderPath, "custom_blogger_content_image_url.txt");
      const wpImgPath = path.join(folderPath, "custom_content_image_url.txt");
      
      if (bloggerContentImageBase64) {
        let activeImgUrl = "";
        if (fs.existsSync(bloggerImgPath)) {
          activeImgUrl = fs.readFileSync(bloggerImgPath, "utf8").trim();
        }
        if (activeImgUrl) {
          contentImgTag = `<img src="${activeImgUrl}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        } else {
          contentImgTag = `<img src="data:image/png;base64,${bloggerContentImageBase64}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        }
      } else if (fs.existsSync(wpImgPath)) {
        const wpImgUrl = fs.readFileSync(wpImgPath, "utf8").trim();
        if (wpImgUrl) {
          contentImgTag = `<img src="${wpImgUrl}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        }
      } else if (wpContentImageBase64) {
        contentImgTag = `<img src="data:image/png;base64,${wpContentImageBase64}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
      }
      
      if (contentImgTag) {
        if (finalBloggerPost.includes("[IMAGE]")) {
          finalBloggerPost = finalBloggerPost.replace("[IMAGE]", contentImgTag);
        } else {
          finalBloggerPost = finalBloggerPost + "<br>" + contentImgTag;
        }
      }

      // 2. 맨 위에 들어가는 메인 썸네일
      let thumbImgTag = "";
      const bloggerThumbPath = path.join(folderPath, "custom_blogger_thumbnail_url.txt");
      const wpThumbPath = path.join(folderPath, "custom_thumbnail_url.txt");
      
      if (bloggerThumbnailBase64) {
        let activeThumbUrl = "";
        if (fs.existsSync(bloggerThumbPath)) {
          activeThumbUrl = fs.readFileSync(bloggerThumbPath, "utf8").trim();
        }
        if (activeThumbUrl) {
          thumbImgTag = `<img src="${activeThumbUrl}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        } else {
          thumbImgTag = `<img src="data:image/png;base64,${bloggerThumbnailBase64}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        }
      } else if (fs.existsSync(wpThumbPath)) {
        const wpThumbUrl = fs.readFileSync(wpThumbPath, "utf8").trim();
        if (wpThumbUrl) {
          thumbImgTag = `<img src="${wpThumbUrl}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        }
      } else if (wpThumbnailBase64) {
        thumbImgTag = `<img src="data:image/png;base64,${wpThumbnailBase64}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
      }

      if (thumbImgTag) {
        if (finalBloggerPost.includes("[THUMBNAIL]")) {
          finalBloggerPost = finalBloggerPost.replace("[THUMBNAIL]", thumbImgTag);
        } else {
          finalBloggerPost = thumbImgTag + "<br>" + finalBloggerPost; // 없으면 맨 위에 추가
        }
      }

      // 3. 유튜브 임베드 처리 [YOUTUBE:https://...]
      // 줄바꿈이 섞여 있는 경우를 대비해 [\s\S]*? 패턴 사용
      const youtubePattern = /\[YOUTUBE:\s*([\s\S]*?)\s*\]/gi;
      finalBloggerPost = finalBloggerPost.replace(youtubePattern, (match, url) => {
        let videoId = "";
        try {
          const cleanUrl = url.replace(/[\n\r]/g, "").trim();
          const urlObj = new URL(cleanUrl);
          if (urlObj.hostname.includes("youtu.be")) {
            videoId = urlObj.pathname.slice(1);
          } else if (urlObj.hostname.includes("youtube.com")) {
            if (urlObj.pathname.includes("/embed/")) {
              videoId = urlObj.pathname.split("/embed/")[1]?.split(/[?#]/)[0];
            } else {
              videoId = urlObj.searchParams.get("v") || "";
            }
          }
          if (videoId) {
            videoId = videoId.split(/[?&]/)[0];
          }
        } catch (e) {
          console.error("Failed to parse YouTube URL:", url, e);
        }

        if (videoId) {
          return `
<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; max-width:100%; margin:20px 0; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
  <iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
<p style="font-size: 14px; color: #666; text-align: center; margin-top: 5px; margin-bottom: 25px;">
  출처: 유튜브 참고 영상 - <a href="${url.replace(/[\n\r]/g, "").trim()}" target="_blank" style="color:#0070f3; text-decoration:underline;">영상 확인하기</a><br>
  <em>"해당 내용에 대해 더 상세히 설명해 주는 유튜브 참고 영상입니다. 시각적으로 참고해 보시면 이해에 훨씬 도움이 됩니다."</em>
</p>
          `.trim();
        }
        return `<p style="color:red;">[유튜브 링크 오류: ${url}]</p>`;
      });

      // 4. 구글 블로그의 가독성 좋은 띄어쓰기(문단 여백) 개선
      let formattedBloggerPost = finalBloggerPost;
      
      // 유튜브/이미지 컴포넌트(div, iframe)를 제외한 일반 줄바꿈 문단들을 <p> 태그 구조로 안전하게 매핑
      // \n\n 으로 문단이 구분되어 있다면 각각의 문단을 <p style="...">으로 감싸기
      const paragraphs = formattedBloggerPost.split(/\n\s*\n/);
      formattedBloggerPost = paragraphs.map(pBlock => {
        const trimmed = pBlock.trim();
        if (!trimmed) return "";
        // 이미 완전히 조립된 HTML 컴포넌트 구조(div, iframe 등)라면 문단 처리를 건너뛰고 그대로 출력
        if (trimmed.startsWith("<div") || trimmed.startsWith("<p") || trimmed.startsWith("<iframe")) {
          return trimmed;
        }
        // 일반 텍스트 문단인 경우 문단 여백 스타일을 주입하고 내부의 단순 줄바꿈은 <br />로 교체
        const cleanContent = trimmed.replace(/\n/g, "<br />");
        return `<p style="line-height:1.8; margin-bottom:24px; word-break:keep-all;">${cleanContent}</p>`;
      }).join("\n");
      
      // 4.1 JSON-LD 스크립트 블럭 추가 (Blogger 노출용)
      if (seoMeta.json_ld && Object.keys(seoMeta.json_ld).length > 0) {
        const jsonLdScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(seoMeta.json_ld, null, 2)}\n</script>\n`;
        formattedBloggerPost += jsonLdScript;
      }
      
      // 릴스 및 카드뉴스 파일 절대 경로 추가
      const videoPath = path.join(folderPath, "reels_shorts.mp4");
      const cardImagePaths: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const p = path.join(folderPath, `slide_${i}.png`);
        if (fs.existsSync(p)) {
          cardImagePaths.push(p);
        }
      }

      // 릴스 동영상 파일 호스팅을 위해 워드프레스 미디어에 업로드
      const videoUrlPath = path.join(folderPath, "reels_shorts_url.txt");
      let hostedVideoUrl = "";

      if (fs.existsSync(videoPath)) {
        if (fs.existsSync(videoUrlPath)) {
          hostedVideoUrl = fs.readFileSync(videoUrlPath, "utf8").trim();
        } else {
          try {
            console.log("🎥 릴스 비디오 발견! 워드프레스 미디어에 호스팅용 업로드 진행...");
            const videoBuffer = fs.readFileSync(videoPath);
            const wpUrl = process.env.WP_URL;
            const username = process.env.WP_ADMIN_USERNAME;
            const appPassword = process.env.WP_APPLICATION_PASSWORD;
            
            if (wpUrl && username && appPassword) {
              const uploadUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
              const safeFileName = `${sanitizedKeyword}_reels.mp4`;
              const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
              
              const res = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${authString}`,
                  "Content-Disposition": `attachment; filename=${safeFileName}`,
                  "Content-Type": "video/mp4"
                },
                body: videoBuffer
              });

              if (res.status === 201) {
                const data = await res.json();
                hostedVideoUrl = data.source_url;
                fs.writeFileSync(videoUrlPath, hostedVideoUrl, "utf8");
                console.log(`[✔] 릴스 비디오 업로드 성공: ${hostedVideoUrl}`);
              } else {
                console.error("WP video upload fail status:", res.status);
              }
            }
          } catch (e: any) {
            console.error("WP video upload error:", e.message);
          }
        }
      }

      // 4.2 호스팅 완료된 이미지 URL 파일 읽기
      const bloggerThumbUrlPath = path.join(folderPath, "custom_blogger_thumbnail_url.txt");
      const bloggerContentUrlPath = path.join(folderPath, "custom_blogger_content_image_url.txt");
      const wpThumbUrlPath = path.join(folderPath, "custom_thumbnail_url.txt");
      const wpContentUrlPath = path.join(folderPath, "custom_content_image_url.txt");

      const bloggerThumbnailUrl = fs.existsSync(bloggerThumbUrlPath) ? fs.readFileSync(bloggerThumbUrlPath, "utf8").trim() : null;
      const bloggerContentImageUrl = fs.existsSync(bloggerContentUrlPath) ? fs.readFileSync(bloggerContentUrlPath, "utf8").trim() : null;
      const wpThumbnailUrl = fs.existsSync(wpThumbUrlPath) ? fs.readFileSync(wpThumbUrlPath, "utf8").trim() : null;
      const wpContentImageUrl = fs.existsSync(wpContentUrlPath) ? fs.readFileSync(wpContentUrlPath, "utf8").trim() : null;

      const n8nPayload = {
        keyword: keyword.replace(/_/g, " "),
        title: title || seoMeta.title || keyword.replace(/_/g, " "),
        content_markdown: contentMarkdown,
        meta_description: seoMeta.meta_description || "",
        slug: seoMeta.slug || sanitizedKeyword.toLowerCase().replace(/_/g, "-"),
        tags: seoMeta.tags || [],
        wp_url: process.env.WP_URL || "",
        wp_username: process.env.WP_ADMIN_USERNAME || "",
        wp_app_password: process.env.WP_APPLICATION_PASSWORD || "",
        shorts,
        cardNews,
        xThread,
        bloggerPost: formattedBloggerPost,
        snsCaption,
        video_path: fs.existsSync(videoPath) ? videoPath : null,
        reels_video_url: hostedVideoUrl || null,
        card_image_paths: cardImagePaths,
        blogger_thumbnail_url: bloggerThumbnailUrl || wpThumbnailUrl,
        blogger_content_image_url: bloggerContentImageUrl || wpContentImageUrl,
        wp_thumbnail_url: wpThumbnailUrl,
        wp_content_image_url: wpContentImageUrl
      };
      
      try {
        const n8nRes = await fetch(n8nUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(n8nPayload)
        });
        
        const resText = await n8nRes.text();
        if (n8nRes.ok) {
          return NextResponse.json({ success: true, message: "n8n Webhook triggered successfully!", response: resText });
        } else {
          return NextResponse.json({ error: "n8n_failed", details: resText, status: n8nRes.status }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({ error: "n8n_network_error", details: err.message }, { status: 500 });
      }
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
