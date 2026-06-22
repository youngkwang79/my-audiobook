const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// .env.local 로드
const dotenvPath = path.join(__dirname, '..', '..', '.env.local');
dotenv.config({ path: dotenvPath });

// 임시 도메인을 사용하여 서버 단 SSL 전파 완료 여부 테스트
const wpUrl = "https://murimbook.mycafe24.com";
const wpUser = process.env.WP_ADMIN_USERNAME;
const wpPassword = process.env.WP_APPLICATION_PASSWORD;

console.log(`[*] 임시 도메인 연결 타겟 주소: ${wpUrl}`);
console.log(`[*] 사용자 아이디: ${wpUser}`);

const apiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

const postData = {
  title: 'AI 자동화 시스템 임시 도메인 테스트',
  content: '<h2>임시 도메인을 통한 연결 검증 포스트입니다.</h2><p>성공적으로 연결되었습니다!</p>',
  status: 'publish'
};

async function runTest() {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('[*] 워드프레스 임시 도메인 API 호출 요청 중...');
    
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

    if (response.status === 201) {
      console.log('[OK] 임시 도메인 연결 및 글 발행 성공!');
      const data = await response.json();
      console.log(`[*] 생성된 포스트 링크: ${data.link}`);
    } else {
      console.log(`[FAIL] 글 발행 실패 (상태 코드: {response.status})`);
      const errText = await response.text();
      console.log(`상세 에러 내용: ${errText}`);
    }
  } catch (error) {
    console.error(`[FAIL] 네트워크 연결 실패:`, error);
  }
}

runTest();
