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
  const { data: works, error } = await supabase
    .from('works')
    .select('id, title, description, subtitle')
    .ilike('subtitle', '%블로그%');

  if (error) {
    console.error('Error fetching works:', error);
    return;
  }

  console.log('--- BLOG WORKS ---');
  works.forEach(w => {
    console.log(`ID: ${w.id}`);
    console.log(`Title: ${w.title}`);
    console.log(`Description Snippet: ${w.description ? w.description.substring(0, 150) + '...' : 'NULL'}`);
    console.log('-----------------');
  });
}

main();
