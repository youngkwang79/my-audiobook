const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let url = '';
let key = '';

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const parts = line.trim().split('=');
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
      if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = v;
    }
  });
}

// Remove surrounding quotes if any
url = url.replace(/^['"]|['"]$/g, '');
key = key.replace(/^['"]|['"]$/g, '');

const supabase = createClient(url, key);

async function main() {
  const { data: works, error: wErr } = await supabase.from('works').select('*').ilike('title', '%시간관리%');
  if (wErr) {
    console.error('Works error:', wErr);
    return;
  }
  console.log('Works:', works);
  if (works && works.length > 0) {
    for (const w of works) {
      const { data: eps, error: eErr } = await supabase.from('episodes').select('*').eq('work_id', w.id);
      if (eErr) {
        console.error('Episodes error:', eErr);
        continue;
      }
      console.log(`Episodes for ${w.title}:`);
      eps.forEach(e => {
        console.log(`- ID: ${e.id}, Title: ${e.title}, locked: ${e.locked}, is_membership_only: ${e.is_membership_only}, audio_url: ${e.audio_url}`);
      });
    }
  }
}

main();
