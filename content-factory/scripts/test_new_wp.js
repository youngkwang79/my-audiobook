const fs = require('fs');
const path = require('path');

// .env.local 로드
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

// 신규 도메인 테스트
const wpUrl = process.env.WP_URL || "https://blog.murimbook.com";
const wpUser = process.env.WP_ADMIN_USERNAME;
const wpPassword = process.env.WP_APPLICATION_PASSWORD;

console.log(`[*] 신규 도메인 연결 타겟 주소: ${wpUrl}`);
console.log(`[*] 사용자 아이디: ${wpUser}`);

const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

const postData = {
  title: 'AI 자동화 시스템 신규 도메인 테스트',
  content: '<h2>신규 도메인 blog.murimbook.com을 통한 연결 검증 포스트입니다.</h2><p>성공적으로 연결되었습니다!</p>',
  status: 'publish'
};

async function runTest() {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('[*] 워드프레스 신규 도메인 API 호출 요청 중...');
    
    const authHeader = 'Basic ' + Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(postData)
    });

    console.log("Response status:", response.status);
    const text = await response.text();
    if (response.status === 201) {
      console.log('[OK] 신규 도메인 연결 및 글 발행 성공!');
      try {
        const data = JSON.parse(text);
        console.log(`[*] 생성된 포스트 링크: ${data.link}`);
      } catch (e) {
        console.log("Response Text:", text);
      }
    } else {
      console.log(`[FAIL] 글 발행 실패 (상태 코드: ${response.status})`);
      console.log(`상세 에러 내용: ${text}`);
    }
  } catch (error) {
    console.error(`[FAIL] 네트워크 연결 실패:`, error);
  }
}

runTest();
