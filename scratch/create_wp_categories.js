const fs = require('fs');
const path = require('path');

// Read .env.local manually to get WP credentials
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const wpUrl = env['WP_URL'] || 'https://blog.murimbook.com';
const username = env['WP_ADMIN_USERNAME'];
const appPassword = env['WP_APPLICATION_PASSWORD'];

if (!username || !appPassword) {
  console.error("WP credentials not found in .env.local");
  process.exit(1);
}

const categories = [
  "금융-재테크",
  "신용-체크카드",
  "자동차-교통",
  "세금-연말정산",
  "부동산-주거",
  "건강-의료",
  "정부지원-복지",
  "IT-통신비",
  "취업-이직",
  "AI-자동화",
  "여행-항공권"
];

async function createCategories() {
  const authHeader = 'Basic ' + Buffer.from(username + ':' + appPassword).toString('base64');
  console.log(`Starting category creation on ${wpUrl}...`);

  for (const cat of categories) {
    try {
      const res = await fetch(`${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          name: cat.replace('-', '/'), // 실제 이름은 슬래시(/) 형태 유지
          slug: encodeURIComponent(cat.toLowerCase())
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Success: Category "${cat.replace('-', '/')}" created (ID: ${data.id})`);
      } else {
        // WordPress will return error if category already exists
        if (data.code === 'term_exists') {
          console.log(`ℹ️ Already Exists: "${cat.replace('-', '/')}"`);
        } else {
          console.log(`❌ Failed: Category "${cat.replace('-', '/')}" - ${data.message || JSON.stringify(data)}`);
        }
      }
    } catch (e) {
      console.error(`💥 Error creating "${cat}":`, e.message);
    }
  }
}

createCategories();
