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
  const ids = ['time_study', 'brokerage-tips', 'automation-tips'];
  for (const id of ids) {
    const { data, error } = await supabase.from('works').select('id, description').eq('id', id).single();
    if (!error && data) {
      fs.writeFileSync(path.join(__dirname, `${id}_desc.txt`), data.description, 'utf8');
      console.log(`Saved ${id}_desc.txt`);
    } else {
      console.error(`Error for ${id}:`, error);
    }
  }
}

main();
