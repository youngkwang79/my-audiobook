// content-factory/scripts/4_publish_wp.js
// 사용 예시: node content-factory/scripts/4_publish_wp.js --dir=keyword_folder --title="내 포스트 제목"

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();

// .env.local 파일 수동 로드
try {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=');
        process.env[key.trim()] = val.trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env.local:", e.message);
}

// 텔레그램 실시간 알림 기능
async function sendTelegramAlert(title, editLink) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log("[*] 텔레그램 설정 누락으로 알림 발송 생략.");
    return;
  }
  
  const text = `🎉 *워드프레스 임시저장 글 배포 완료!*\n\n📝 *제목:* ${title}\n🔗 *편집/승인 링크:* ${editLink}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
  
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log("[✔] 텔레그램 승인 알림 발송 성공!");
    } else {
      console.error("[❌] 텔레그램 알림 발송 실패:", await res.text());
    }
  } catch (err) {
    console.error("[❌] 텔레그램 알림 네트워크 오류:", err.message);
  }
}

// Google Imagen 3 혹은 OpenAI DALL-E 활용 썸네일 이미지 자동 생성
async function generateAndUploadThumbnail(title) {
  const googleKey = process.env.GOOGLE_OPENAI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!googleKey && !openaiKey) {
    console.log("[*] API 키 누락으로 AI 대표 이미지 생성 생략.");
    return null;
  }

  // 1. Google Gemini Imagen 3 우선 적용 (무료)
  if (googleKey) {
    console.log("🎨 Google Gemini Imagen 3로 무료 썸네일 이미지 생성 중...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${googleKey}`;
    const prompt = `A clean, professional modern graphic design representing the topic: "${title}". 3D render style with a sleek dark/blue theme, corporate web aesthetic, no text.`;
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          numberOfImages: 1,
          outputMimeType: "image/png",
          aspectRatio: "1:1"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const base64ImageBytes = data.generatedImages[0].image.imageBytes;
        console.log("[✔] Google Imagen 이미지 생성 완료! 워드프레스 업로드 진행...");
        return await uploadBase64MediaToWordPress(base64ImageBytes, `${title.replace(/\s+/g, "_")}.png`);
      } else {
        console.warn("[⚠️] Google Imagen 생성 실패 (일부 규제 걸림), OpenAI 차선책 시도...", await res.text());
      }
    } catch (err) {
      console.error("[❌] Google Imagen 프로세스 오류:", err.message);
    }
  }

  // 2. OpenAI DALL-E 차선책 적용
  if (openaiKey) {
    console.log("🎨 OpenAI DALL-E 이미지 생성 중...");
    const prompt = `A clean, professional modern graphic design representing the topic: "${title}". 3D render style with a sleek dark/blue theme, corporate web aesthetic, no text.`;
    const url = "https://api.openai.com/v1/images/generations";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "dall-e-2",
          prompt: prompt,
          n: 1,
          size: "1024x1024"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.data[0].url;
        console.log("[✔] OpenAI DALL-E 이미지 생성 완료! 워드프레스 업로드 진행...");
        return await uploadMediaToWordPress(imageUrl, `${title.replace(/\s+/g, "_")}.png`);
      }
    } catch (err) {
      console.error("[❌] DALL-E 프로세스 오류:", err.message);
    }
  }

  return null;
}

// Google Imagen에서 출력된 Base64 데이터를 워드프레스 미디어 API에 업로드
async function uploadBase64MediaToWordPress(base64Data, fileName) {
  const wpUrl = process.env.WP_URL;
  const username = process.env.WP_ADMIN_USERNAME;
  const appPassword = process.env.WP_APPLICATION_PASSWORD;
  const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
  
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Disposition": `attachment; filename=${encodeURIComponent(fileName)}`,
        "Content-Type": "image/png"
      },
      body: buffer
    });

    if (res.status === 201) {
      const data = await res.json();
      console.log(`[✔] 대표 이미지 업로드 성공! 미디어 ID: ${data.id}`);
      return data.id;
    } else {
      console.error("[❌] 워드프레스 미디어 업로드 실패:", await res.text());
      return null;
    }
  } catch (err) {
    console.error("[❌] 미디어 업로드 처리 중 오류:", err.message);
    return null;
  }
}

// 외부 이미지 URL을 워드프레스 미디어 API에 업로드 (DALL-E 용)
async function uploadMediaToWordPress(imgUrl, fileName) {
  const wpUrl = process.env.WP_URL;
  const username = process.env.WP_ADMIN_USERNAME;
  const appPassword = process.env.WP_APPLICATION_PASSWORD;
  const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
  
  try {
    const imgRes = await fetch(imgUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Disposition": `attachment; filename=${encodeURIComponent(fileName)}`,
        "Content-Type": "image/png"
      },
      body: buffer
    });

    if (res.status === 201) {
      const data = await res.json();
      console.log(`[✔] 대표 이미지 업로드 성공! 미디어 ID: ${data.id}`);
      return data.id;
    } else {
      console.error("[❌] 워드프레스 미디어 업로드 실패:", await res.text());
      return null;
    }
  } catch (err) {
    console.error("[❌] 미디어 업로드 처리 중 오류:", err.message);
    return null;
  }
}

// 간단한 자체 마크다운 -> HTML 변환기
function markdownToHtml(md) {
  let html = md;
  
  // 코드 블록 변환
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang || 'plaintext'}">${cleanCode}</code></pre>`;
  });
  
  // 헤더 변환
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 볼드체 변환
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 링크 변환
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 문단 분리
  const blocks = html.split(/\n\s*\n/);
  const parsedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });
  
  let finalHtml = parsedBlocks.join('\n');

  const adCode1 = `<div class="adsense-slot ads-top" style="margin:20px 0; text-align:center; min-height:90px; background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4); font-size:12px;">[광고 슬롯 - 본문 상단 배치]</div>`;
  const adCode2 = `<div class="adsense-slot ads-bottom" style="margin:20px 0; text-align:center; min-height:90px; background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4); font-size:12px;">[광고 슬롯 - 본문 하단 배치]</div>`;

  finalHtml = finalHtml.replace('[AD_INSERT_1]', adCode1);
  finalHtml = finalHtml.replace('[AD_INSERT_2]', adCode2);

  return finalHtml;
}

// Argument 파싱
const args = process.argv.slice(2);
let dirName = '';
let customTitle = '';

for (const arg of args) {
  if (arg.startsWith('--dir=')) {
    dirName = arg.split('=')[1];
  } else if (arg.startsWith('--title=')) {
    customTitle = arg.split('=')[1];
  }
}

if (!dirName) {
  console.error("❌ Error: --dir=폴더명 매개변수가 필요합니다.");
  process.exit(1);
}

const targetDir = path.resolve(__dirname, `../output/${dirName}`);
const mdPath = path.join(targetDir, 'blog_post.md');
const seoPath = path.join(targetDir, 'seo_meta.json');

if (!fs.existsSync(mdPath)) {
  console.error(`❌ Error: '${mdPath}' 파일을 찾을 수 없습니다.`);
  process.exit(1);
}

const blogMdContent = fs.readFileSync(mdPath, 'utf8');
const blogHtmlContent = markdownToHtml(blogMdContent);

let seoMeta = {};
if (fs.existsSync(seoPath)) {
  try {
    seoMeta = JSON.parse(fs.readFileSync(seoPath, 'utf8'));
  } catch (e) {
    console.error("SEO metadata parse fail:", e.message);
  }
}

const wpUrl = process.env.WP_URL;
const username = process.env.WP_ADMIN_USERNAME;
const appPassword = process.env.WP_APPLICATION_PASSWORD;

if (!wpUrl || !username || !appPassword) {
  console.error("⚠️ Error: WP_URL, WP_ADMIN_USERNAME, WP_APPLICATION_PASSWORD가 .env.local에 설정되어 있어야 합니다.");
  process.exit(1);
}

const originalKeyword = dirName.replace(/_/g, ' ');
const postTitle = customTitle || seoMeta.title || originalKeyword;

async function startPublishing() {
  const featuredMediaId = await generateAndUploadThumbnail(postTitle);

  const payloadData = {
    title: postTitle,
    content: blogHtmlContent,
    slug: seoMeta.slug || dirName.toLowerCase().replace(/_/g, '-'),
    status: 'draft'
  };

  if (featuredMediaId) {
    payloadData.featured_media = featuredMediaId;
  }

  if (seoMeta.meta_description) {
    payloadData.meta = {
      _yoast_wpseo_metadesc: seoMeta.meta_description,
      rank_math_description: seoMeta.meta_description
    };
  }

  const payload = JSON.stringify(payloadData);
  const urlObj = new URL(`${wpUrl}/wp-json/wp/v2/posts`);
  const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const options = {
    method: 'POST',
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname,
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    rejectUnauthorized: false
  };

  const reqLib = urlObj.protocol === 'https:' ? https : http;

  console.log(`📤 워드프레스 블로그 (${wpUrl})에 임시저장 글로 전송 중...`);

  let attempts = 0;
  const maxAttempts = 3;

  function sendRequest() {
    attempts++;
    const req = reqLib.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resObj = JSON.parse(responseData);
          const editLink = `${wpUrl}/wp-admin/post.php?post=${resObj.id}&action=edit`;
          console.log(`\n✅ 워드프레스 포스팅 성공!`);
          console.log(`🔗 글 ID: ${resObj.id}`);
          console.log(`🔗 편집 페이지 링크: ${editLink}`);

          saveHistoryToDb(originalKeyword, postTitle, resObj.id, resObj.link);
          sendTelegramAlert(postTitle, editLink);
        } else {
          console.error(`❌ 워드프레스 API 에러 (HTTP ${res.statusCode}):`, responseData);
          retryOrExit();
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error (시도 ${attempts}/${maxAttempts}):`, e.message);
      retryOrExit();
    });

    req.write(payload);
    req.end();
  }

  function retryOrExit() {
    if (attempts < maxAttempts) {
      console.log(`[*] 5초 대기 후 재시도합니다...`);
      setTimeout(sendRequest, 5000);
    } else {
      console.error("❌ 최대 재시도 횟수를 초과하여 발행에 실패했습니다.");
      process.exit(1);
    }
  }

  sendRequest();
}

function saveHistoryToDb(keyword, title, postId, postUrl) {
  const dbPath = path.resolve(__dirname, "../data/history.db");
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("[❌] DB 접속 에러:", err.message);
      return;
    }
  });

  const sql = `INSERT INTO post_history (keyword, title, post_id, post_url, status) 
               VALUES (?, ?, ?, ?, 'draft')
               ON CONFLICT(keyword) DO UPDATE SET
               title=excluded.title, post_id=excluded.post_id, post_url=excluded.post_url;`;

  db.run(sql, [keyword, title, postId, postUrl], function(err) {
    if (err) {
      console.error("[❌] 히스토리 데이터베이스 저장 실패:", err.message);
    } else {
      console.log("[✔] 발행 결과가 SQLite 데이터베이스에 정상 기록되었습니다.");
    }
  });

  db.close();
}

startPublishing();
