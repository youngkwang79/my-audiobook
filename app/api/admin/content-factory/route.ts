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

async function uploadVideoFileToWordPress(filePath: string, fileName: string): Promise<string | null> {
  const wpUrl = process.env.WP_URL;
  const username = process.env.WP_ADMIN_USERNAME;
  const appPassword = process.env.WP_APPLICATION_PASSWORD;
  
  if (!wpUrl || !username || !appPassword || !fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const buffer = fs.readFileSync(filePath);
    const uploadUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
    
    console.log(`Uploading Reels video to WordPress: ${safeFileName}...`);
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Disposition": `attachment; filename=${safeFileName}`,
        "Content-Type": "video/mp4"
      },
      body: buffer
    });

    if (res.status === 201) {
      const data = await res.json();
      console.log(`[✔] Reels video uploaded successfully! URL: ${data.source_url}`);
      return data.source_url;
    } else {
      console.error("WP video upload response status:", res.status, await res.text());
    }
  } catch (err: any) {
    console.error("WordPress video upload helper error:", err.message);
  }
  return null;
}

async function uploadBase64ToWordPress(
  base64Data: string, 
  fileName: string,
  altText: string = "",
  titleText: string = "",
  captionText: string = "",
  descriptionText: string = ""
): Promise<string | null> {
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
      console.log(`[✔] WordPress media uploaded successfully! ID: ${data.id}`);
      
      // Update media details
      if (altText || titleText || captionText || descriptionText) {
        try {
          const updateUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media/${data.id}`;
          const updatePayload: any = {};
          if (altText) updatePayload.alt_text = altText;
          if (titleText) updatePayload.title = titleText;
          if (captionText) updatePayload.caption = captionText;
          if (descriptionText) updatePayload.description = descriptionText;
          
          await fetch(updateUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authString}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(updatePayload)
          });
          console.log(`[✔] Media metadata updated: "${altText}"`);
        } catch (metaErr: any) {
          console.error("Failed to update media metadata in route:", metaErr.message);
        }
      }
      
      return data.source_url;
    } else {
      console.error("WP media upload response status:", res.status, await res.text());
    }
  } catch (err: any) {
    console.error("WordPress media upload helper error:", err.message);
  }
  return null;
}

async function publishToBlogger(title: string, contentHtml: string): Promise<{ postId: string; editLink: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const blogId = process.env.BLOGGER_BLOG_ID;

  if (!clientId || !clientSecret || !refreshToken || !blogId) {
    console.error("Missing Google Blogger configuration environment variables in .env.local");
    return null;
  }

  try {
    console.log("Refreshing Google OAuth2 Access Token for Blogger API...");
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!tokenRes.ok) {
      console.error("Failed to refresh Google access token:", await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error("No access_token returned in refresh response");
      return null;
    }

    console.log(`Creating Blogger draft post in Blog ID: ${blogId}...`);
    const createPostUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?isDraft=true`;
    const postRes = await fetch(createPostUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: title,
        content: contentHtml
      })
    });

    if (!postRes.ok) {
      console.error("Blogger API create post error:", await postRes.text());
      return null;
    }

    const postData = await postRes.json();
    const postId = postData.id;
    if (postId) {
      return {
        postId: postId,
        editLink: `https://www.blogger.com/blog/post/edit/${blogId}/${postId}`
      };
    }
  } catch (err: any) {
    console.error("publishToBlogger error:", err.message);
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
    const { 
      action, query, keyword, title, extraFact, 
      wpThumbnailBase64, wpContentImageBase64, generatedMarkdown, 
      bloggerPost, bloggerThumbnailBase64, bloggerContentImageBase64, 
      topRankPostSummary,
      metaDescription,
      
      // Unified payload parameters
      wpKeyword, wpTitle, wpContent,
      bloggerKeyword, bloggerTitle,
      snsCaption, reelsVideoUrl
    } = body;

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
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      // 기존 이미지 캐시 및 잔여 파일 완벽 청소
      if (fs.existsSync(folderPath)) {
        const filesToClean = [
          "custom_thumbnail.png",
          "custom_thumbnail_url.txt",
          "custom_content_image.png",
          "custom_content_image_url.txt",
          "custom_blogger_thumbnail.png",
          "custom_blogger_thumbnail_url.txt",
          "custom_blogger_content_image.png",
          "custom_blogger_content_image_url.txt",
          "reels_shorts.mp4",
          "reels_shorts_url.txt"
        ];
        filesToClean.forEach(f => {
          const p = path.join(folderPath, f);
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch (e) {}
          }
        });
      }

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
      
      const postPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword, "blog_post.md");
      
      if (!fs.existsSync(postPath)) {
        throw new Error("Blog post file was not generated");
      }
      
      const blogContent = fs.readFileSync(postPath, "utf8");

      // SEO 메타 정보도 함께 반환
      let metaDescription = "";
      const seoPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword, "seo_meta.json");
      if (fs.existsSync(seoPath)) {
        try {
          const seoData = JSON.parse(fs.readFileSync(seoPath, "utf8"));
          metaDescription = seoData.meta_description || "";
        } catch (e) {}
      }

      return NextResponse.json({ success: true, keyword: sanitizedKeyword, markdown: blogContent, metaDescription });
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
      const threadsCaptionPath = path.join(folderPath, "threads_caption.txt");
      
      const shorts = fs.existsSync(shortsPath) ? fs.readFileSync(shortsPath, "utf8") : "";
      const xThread = fs.existsSync(xPath) ? fs.readFileSync(xPath, "utf8") : "";
      const bloggerPost = fs.existsSync(bloggerPath) ? fs.readFileSync(bloggerPath, "utf8") : "";
      const snsCaption = fs.existsSync(snsCaptionPath) ? fs.readFileSync(snsCaptionPath, "utf8") : "";
      const threadsCaption = fs.existsSync(threadsCaptionPath) ? fs.readFileSync(threadsCaptionPath, "utf8") : "";
      
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
        snsCaption,
        threadsCaption
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

      const metaDescFromPayload = body.metaDescription || "";

      if (generatedMarkdown) {
        fs.writeFileSync(path.join(folderPath, "blog_post.md"), generatedMarkdown, "utf8");
      }

      // metaDescription을 받은 경우 seo_meta.json에도 반영
      if (metaDescFromPayload) {
        const seoMetaPath = path.join(folderPath, "seo_meta.json");
        let seoMeta: any = {};
        if (fs.existsSync(seoMetaPath)) {
          try { seoMeta = JSON.parse(fs.readFileSync(seoMetaPath, "utf8")); } catch(e) {}
        }
        seoMeta.meta_description = metaDescFromPayload;
        fs.writeFileSync(seoMetaPath, JSON.stringify(seoMeta, null, 2), "utf8");
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

    // --- Action: Publish to Blogger (Blogger API Uploader) ---
    if (action === "publish-blogger") {
      if (!keyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });
      
      const sanitizedKeyword = sanitizeKeyword(keyword);
      const folderPath = path.join(process.cwd(), "content-factory", "output", sanitizedKeyword);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      if (bloggerPost) {
        fs.writeFileSync(path.join(folderPath, "blogger_post.txt"), bloggerPost, "utf8");
      }

      if (bloggerThumbnailBase64) {
        const buffer = Buffer.from(bloggerThumbnailBase64, "base64");
        fs.writeFileSync(path.join(folderPath, "custom_blogger_thumbnail.png"), buffer);
        try {
          const url = await uploadBase64ToWordPress(
            bloggerThumbnailBase64, 
            `${sanitizedKeyword}_blogger_thumb.png`,
            title || keyword.replace(/_/g, " "),
            title || keyword.replace(/_/g, " "),
            title || keyword.replace(/_/g, " "),
            `${title || keyword.replace(/_/g, " ")} - 대표 썸네일 이미지`
          );
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
          const url = await uploadBase64ToWordPress(
            bloggerContentImageBase64, 
            `${sanitizedKeyword}_blogger_content.png`,
            title || keyword.replace(/_/g, " "),
            `${title || keyword.replace(/_/g, " ")} 본문 이미지`,
            `${title || keyword.replace(/_/g, " ")} 본문 이미지`,
            `${title || keyword.replace(/_/g, " ")} - 본문 설명 이미지`
          );
          if (url) {
            fs.writeFileSync(path.join(folderPath, "custom_blogger_content_image_url.txt"), url, "utf8");
            console.log(`[✔] Blogger Content Image auto-uploaded to WP for hosting: ${url}`);
          }
        } catch (e: any) {
          console.error("Blogger Content Image auto-upload error:", e.message);
        }
      }

      const seoPath = path.join(folderPath, "seo_meta.json");
      let seoMeta: any = {};
      if (fs.existsSync(seoPath)) {
        try {
          seoMeta = JSON.parse(fs.readFileSync(seoPath, "utf8"));
        } catch (e) {}
      }

      // 메타설명을 payload에서 받아 seo_meta.json에 반영
      const metaDescFromPayload = metaDescription || body.bloggerMetaDescription || "";
      if (metaDescFromPayload) {
        seoMeta.meta_description = metaDescFromPayload;
        try {
          fs.writeFileSync(seoPath, JSON.stringify(seoMeta, null, 2), "utf8");
        } catch (e) {}
      }

      let finalBloggerPost = bloggerPost || (fs.existsSync(path.join(folderPath, "blogger_post.txt")) ? fs.readFileSync(path.join(folderPath, "blogger_post.txt"), "utf8") : "");

      // 1. 이미지 처리
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
        }
      } else if (fs.existsSync(wpImgPath)) {
        const wpImgUrl = fs.readFileSync(wpImgPath, "utf8").trim();
        if (wpImgUrl) {
          contentImgTag = `<img src="${wpImgUrl}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        }
      }

      if (contentImgTag) {
        if (finalBloggerPost.includes("[IMAGE]")) {
          finalBloggerPost = finalBloggerPost.replace("[IMAGE]", contentImgTag);
        } else {
          finalBloggerPost = finalBloggerPost + "<br>" + contentImgTag;
        }
      }

      // 2. 썸네일 처리
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
        }
      } else if (fs.existsSync(wpThumbPath)) {
        const wpThumbUrl = fs.readFileSync(wpThumbPath, "utf8").trim();
        if (wpThumbUrl) {
          thumbImgTag = `<img src="${wpThumbUrl}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        }
      }

      if (thumbImgTag) {
        if (finalBloggerPost.includes("[THUMBNAIL]")) {
          finalBloggerPost = finalBloggerPost.replace("[THUMBNAIL]", thumbImgTag);
        } else {
          finalBloggerPost = thumbImgTag + "<br>" + finalBloggerPost;
        }
      }

      // 3. 유튜브 임베드 처리
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
        } catch (e) {}

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

      // 4. 가독성 줄바꿈 태그 변환
      let formattedBloggerPost = finalBloggerPost;
      const paragraphs = formattedBloggerPost.split(/\n\s*\n/);
      formattedBloggerPost = paragraphs.map(pBlock => {
        const trimmed = pBlock.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("<div") || trimmed.startsWith("<p") || trimmed.startsWith("<iframe") ||
            trimmed.startsWith("<hr") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") ||
            trimmed.startsWith("<li") || trimmed.startsWith("<h1") || trimmed.startsWith("<h2") ||
            trimmed.startsWith("<h3") || trimmed.startsWith("<h4") || trimmed.startsWith("<h5") ||
            trimmed.startsWith("<h6") || trimmed.startsWith("<script") || trimmed.startsWith("<meta") ||
            trimmed.startsWith("<img") || trimmed.startsWith("<table") || trimmed.startsWith("<figure")) {
          return trimmed;
        }
        const cleanContent = trimmed.replace(/\n/g, "<br />");
        return `<p style="line-height:1.8; margin-bottom:24px; word-break:keep-all;">${cleanContent}</p>`;
      }).join("\n");

      // 4.1 JSON-LD 추가
      if (seoMeta.json_ld && Object.keys(seoMeta.json_ld).length > 0) {
        const jsonLdScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(seoMeta.json_ld, null, 2)}\n</script>\n`;
        formattedBloggerPost += jsonLdScript;
      }

      // 4.2 메타설명 블록 HTML 삽입 (포맷팅 완료 후 맨 앞에 추가)
      const finalMetaDesc = seoMeta.meta_description || "";
      if (finalMetaDesc) {
        const metaHtml = `<meta name="description" content="${finalMetaDesc.replace(/"/g, '&quot;')}">
<div style="display:none;" aria-hidden="true" data-meta-description="true">${finalMetaDesc}</div>`;
        formattedBloggerPost = metaHtml + "\n" + formattedBloggerPost;
      }

      // 5. Blogger API 업로드
      const postTitle = title || seoMeta.title || keyword.replace(/_/g, " ");
      const publishResult = await publishToBlogger(postTitle, formattedBloggerPost);

      if (publishResult) {
        return NextResponse.json({
          success: true,
          postId: publishResult.postId,
          editLink: publishResult.editLink
        });
      } else {
        return NextResponse.json({ error: "blogger_publish_failed" }, { status: 500 });
      }
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

      return NextResponse.json({
        success: true,
        log: outputLog
      });
    }

    // --- Action: Send to n8n Webhook ---
    if (action === "n8n") {
      const isUnified = !!wpKeyword;
      const targetWpKeyword = isUnified ? wpKeyword : keyword;
      const targetBloggerKeyword = isUnified ? bloggerKeyword : keyword;

      if (!targetWpKeyword) return NextResponse.json({ error: "missing_keyword" }, { status: 400 });

      const sanitizedWpKeyword = sanitizeKeyword(targetWpKeyword);
      const sanitizedBloggerKeyword = targetBloggerKeyword ? sanitizeKeyword(targetBloggerKeyword) : sanitizedWpKeyword;

      const wpFolderPath = path.join(process.cwd(), "content-factory", "output", sanitizedWpKeyword);
      const bloggerFolderPath = path.join(process.cwd(), "content-factory", "output", sanitizedBloggerKeyword);

      const wpPostPath = path.join(wpFolderPath, "blog_post.md");
      if (!fs.existsSync(wpPostPath)) {
        return NextResponse.json({ error: `WordPress post not found under keyword: ${targetWpKeyword}` }, { status: 400 });
      }

      const contentMarkdown = wpContent || fs.readFileSync(wpPostPath, "utf8");
      let finalContentMarkdown = contentMarkdown;

      const wpSeoPath = path.join(wpFolderPath, "seo_meta.json");
      let wpSeoMeta: any = {};
      if (fs.existsSync(wpSeoPath)) {
        try {
          wpSeoMeta = JSON.parse(fs.readFileSync(wpSeoPath, "utf8"));
        } catch (e) {}
      }

      if (wpSeoMeta.json_ld && Object.keys(wpSeoMeta.json_ld).length > 0) {
        const jsonLdScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(wpSeoMeta.json_ld, null, 2)}\n</script>\n`;
        finalContentMarkdown += jsonLdScript;
      }

      const bloggerSeoPath = path.join(bloggerFolderPath, "seo_meta.json");
      let bloggerSeoMeta: any = {};
      if (fs.existsSync(bloggerSeoPath)) {
        try {
          bloggerSeoMeta = JSON.parse(fs.readFileSync(bloggerSeoPath, "utf8"));
        } catch (e) {}
      }

      // Format Blogger Post
      let finalBloggerPost = bloggerPost || "";
      if (!finalBloggerPost) {
        const bloggerPostPath = path.join(bloggerFolderPath, "blogger_post.txt");
        if (fs.existsSync(bloggerPostPath)) {
          finalBloggerPost = fs.readFileSync(bloggerPostPath, "utf8");
        } else {
          const bloggerMdPath = path.join(bloggerFolderPath, "blog_post.md");
          if (fs.existsSync(bloggerMdPath)) {
            finalBloggerPost = fs.readFileSync(bloggerMdPath, "utf8");
          }
        }
      }

      let contentImgTag = "";
      const bloggerImgPath = path.join(bloggerFolderPath, "custom_blogger_content_image_url.txt");
      const wpImgPath = path.join(wpFolderPath, "custom_content_image_url.txt");

      if (bloggerContentImageBase64) {
        fs.writeFileSync(path.join(bloggerFolderPath, "custom_blogger_content_image.png"), Buffer.from(bloggerContentImageBase64, "base64"));
        try {
          const url = await uploadBase64ToWordPress(
            bloggerContentImageBase64, 
            `${sanitizedBloggerKeyword}_blogger_content.png`,
            bloggerTitle || targetBloggerKeyword.replace(/_/g, " "),
            `${bloggerTitle || targetBloggerKeyword.replace(/_/g, " ")} 본문 이미지`,
            `${bloggerTitle || targetBloggerKeyword.replace(/_/g, " ")} 본문 이미지`,
            `${bloggerTitle || targetBloggerKeyword.replace(/_/g, " ")} - 본문 설명 이미지`
          );
          if (url) {
            fs.writeFileSync(bloggerImgPath, url, "utf8");
            contentImgTag = `<img src="${url}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
          }
        } catch (e: any) {
          console.error("Blogger Content Image auto-upload error:", e.message);
        }
      } else if (fs.existsSync(bloggerImgPath)) {
        const activeImgUrl = fs.readFileSync(bloggerImgPath, "utf8").trim();
        if (activeImgUrl) {
          contentImgTag = `<img src="${activeImgUrl}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        }
      } else if (fs.existsSync(wpImgPath)) {
        const wpImgUrl = fs.readFileSync(wpImgPath, "utf8").trim();
        if (wpImgUrl) {
          contentImgTag = `<img src="${wpImgUrl}" style="max-width:100%; height:auto; border-radius:10px; margin:20px auto; display:block;" alt="content_image" />`;
        }
      }

      if (contentImgTag) {
        if (finalBloggerPost.includes("[IMAGE]")) {
          finalBloggerPost = finalBloggerPost.replace("[IMAGE]", contentImgTag);
        } else {
          finalBloggerPost = finalBloggerPost + "<br>" + contentImgTag;
        }
      }

      let thumbImgTag = "";
      const bloggerThumbPath = path.join(bloggerFolderPath, "custom_blogger_thumbnail_url.txt");
      const wpThumbPath = path.join(wpFolderPath, "custom_thumbnail_url.txt");

      if (bloggerThumbnailBase64) {
        fs.writeFileSync(path.join(bloggerFolderPath, "custom_blogger_thumbnail.png"), Buffer.from(bloggerThumbnailBase64, "base64"));
        try {
          const url = await uploadBase64ToWordPress(
            bloggerThumbnailBase64, 
            `${sanitizedBloggerKeyword}_blogger_thumb.png`,
            bloggerTitle || targetBloggerKeyword.replace(/_/g, " "),
            bloggerTitle || targetBloggerKeyword.replace(/_/g, " "),
            bloggerTitle || targetBloggerKeyword.replace(/_/g, " "),
            `${bloggerTitle || targetBloggerKeyword.replace(/_/g, " ")} - 대표 썸네일 이미지`
          );
          if (url) {
            fs.writeFileSync(bloggerThumbPath, url, "utf8");
            thumbImgTag = `<img src="${url}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
          }
        } catch (e: any) {
          console.error("Blogger Thumbnail auto-upload error:", e.message);
        }
      } else if (fs.existsSync(bloggerThumbPath)) {
        const activeThumbUrl = fs.readFileSync(bloggerThumbPath, "utf8").trim();
        if (activeThumbUrl) {
          thumbImgTag = `<img src="${activeThumbUrl}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        }
      } else if (fs.existsSync(wpThumbPath)) {
        const wpThumbUrl = fs.readFileSync(wpThumbPath, "utf8").trim();
        if (wpThumbUrl) {
          thumbImgTag = `<img src="${wpThumbUrl}" style="max-width:100%; height:auto; border-radius:10px; margin-bottom:20px; display:block;" alt="thumbnail" />`;
        }
      }

      if (thumbImgTag) {
        if (finalBloggerPost.includes("[THUMBNAIL]")) {
          finalBloggerPost = finalBloggerPost.replace("[THUMBNAIL]", thumbImgTag);
        } else {
          finalBloggerPost = thumbImgTag + "<br>" + finalBloggerPost;
        }
      }

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
          if (videoId) videoId = videoId.split(/[?&]/)[0];
        } catch (e) {}

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

      let formattedBloggerPost = finalBloggerPost;
      const paragraphs = formattedBloggerPost.split(/\n\s*\n/);
      formattedBloggerPost = paragraphs.map(pBlock => {
        const trimmed = pBlock.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("<div") || trimmed.startsWith("<p") || trimmed.startsWith("<iframe") ||
            trimmed.startsWith("<hr") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") ||
            trimmed.startsWith("<li") || trimmed.startsWith("<h1") || trimmed.startsWith("<h2") ||
            trimmed.startsWith("<h3") || trimmed.startsWith("<h4") || trimmed.startsWith("<h5") ||
            trimmed.startsWith("<h6") || trimmed.startsWith("<script") || trimmed.startsWith("<meta") ||
            trimmed.startsWith("<img") || trimmed.startsWith("<table") || trimmed.startsWith("<figure")) {
          return trimmed;
        }
        const cleanContent = trimmed.replace(/\n/g, "<br />");
        return `<p style="line-height:1.8; margin-bottom:24px; word-break:keep-all;">${cleanContent}</p>`;
      }).join("\n");

      if (bloggerSeoMeta.json_ld && Object.keys(bloggerSeoMeta.json_ld).length > 0) {
        const jsonLdScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(bloggerSeoMeta.json_ld, null, 2)}\n</script>\n`;
        formattedBloggerPost += jsonLdScript;
      }

      // Reels shorts video & card images (WP as default folder)
      const videoPath = path.join(wpFolderPath, "reels_shorts.mp4");
      const cardImagePaths: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const p = path.join(wpFolderPath, `slide_${i}.png`);
        if (fs.existsSync(p)) {
          cardImagePaths.push(p);
        }
      }

      let hostedVideoUrl = reelsVideoUrl || "";
      if (!hostedVideoUrl && fs.existsSync(videoPath)) {
        const videoUrlPath = path.join(wpFolderPath, "reels_shorts_url.txt");
        if (fs.existsSync(videoUrlPath)) {
          hostedVideoUrl = fs.readFileSync(videoUrlPath, "utf8").trim();
        } else {
          try {
            const uploadedUrl = await uploadVideoFileToWordPress(videoPath, `${sanitizedWpKeyword}_reels_shorts.mp4`);
            if (uploadedUrl) {
              fs.writeFileSync(videoUrlPath, uploadedUrl, "utf8");
              hostedVideoUrl = uploadedUrl;
            }
          } catch (e: any) {
            console.error("Failed to upload Reels video to WordPress:", e.message);
          }
        }
      }

      const shortsPath = path.join(wpFolderPath, "shorts_script.txt");
      const cardPath = path.join(wpFolderPath, "card_news.json");
      const xPath = path.join(wpFolderPath, "x_thread.txt");
      const snsCaptionPath = path.join(wpFolderPath, "sns_caption.txt");
      const threadsCaptionPath = path.join(wpFolderPath, "threads_caption.txt");

      const shorts = fs.existsSync(shortsPath) ? fs.readFileSync(shortsPath, "utf8") : "";
      const xThread = fs.existsSync(xPath) ? fs.readFileSync(xPath, "utf8") : "";
      const finalSnsCaption = snsCaption || (fs.existsSync(snsCaptionPath) ? fs.readFileSync(snsCaptionPath, "utf8") : "");
      const finalThreadsCaption = fs.existsSync(threadsCaptionPath) ? fs.readFileSync(threadsCaptionPath, "utf8") : "";
      let cardNews = null;
      if (fs.existsSync(cardPath)) {
        try {
          cardNews = JSON.parse(fs.readFileSync(cardPath, "utf8"));
        } catch (e) {}
      }

      const bloggerThumbnailUrl = fs.existsSync(bloggerThumbPath) ? fs.readFileSync(bloggerThumbPath, "utf8").trim() : null;
      const bloggerContentImageUrl = fs.existsSync(bloggerImgPath) ? fs.readFileSync(bloggerImgPath, "utf8").trim() : null;
      const wpThumbnailUrl = fs.existsSync(wpThumbPath) ? fs.readFileSync(wpThumbPath, "utf8").trim() : null;
      const wpContentImageUrl = fs.existsSync(wpImgPath) ? fs.readFileSync(wpImgPath, "utf8").trim() : null;

      const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/murimbook-blog";
      console.log(`Sending unified post data to n8n Webhook: ${n8nUrl}`);

      const n8nPayload = {
        keyword: targetWpKeyword.replace(/_/g, " "),
        title: wpTitle || wpSeoMeta.title || targetWpKeyword.replace(/_/g, " "),
        bloggerTitle: bloggerTitle || bloggerSeoMeta.title || (targetBloggerKeyword ? targetBloggerKeyword.replace(/_/g, " ") : ""),
        content_markdown: finalContentMarkdown,
        meta_description: wpSeoMeta.meta_description || "",
        slug: wpSeoMeta.slug || sanitizedWpKeyword.toLowerCase().replace(/_/g, "-"),
        tags: wpSeoMeta.tags || [],
        wp_url: process.env.WP_URL || "",
        wp_username: process.env.WP_ADMIN_USERNAME || "",
        wp_app_password: process.env.WP_APPLICATION_PASSWORD || "",
        shorts,
        cardNews,
        xThread,
        bloggerPost: formattedBloggerPost,
        snsCaption: finalSnsCaption,
        threadsCaption: finalThreadsCaption,
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
