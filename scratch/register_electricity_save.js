const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let url = '';
let serviceKey = '';

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.trim().split('=');
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = v;
    }
  });
}

url = url.replace(/^['"]|['"]$/g, '');
serviceKey = serviceKey.replace(/^['"]|['"]$/g, '');

const supabase = createClient(url, serviceKey);

async function main() {
  // 현재 시간 기준 1시간 뒤의 UTC 시간 구하기
  // 한국시간 7월 3일 오전 4시 4분의 1시간 뒤 = 오전 5시 4분
  const oneHourLater = new Date();
  oneHourLater.setHours(oneHourLater.getHours() + 1);

  const { data, error } = await supabase
    .from('works')
    .update({ 
      status: '공개예정', 
      created_at: oneHourLater.toISOString() 
    })
    .eq('id', 'electricity_save')
    .select();

  if (error) {
    console.error('Error scheduling work:', error);
  } else {
    console.log('Successfully scheduled work for 1 hour later (Reservation):', data[0].created_at);
  }
}

main();
