const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asiuxoprpfhnknswnzal.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaXV4b3BycGZobmtuc3duemFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzMDgzOCwiZXhwIjoyMDg1ODA2ODM4fQ.EEu_HDwk9R86Us1H_aKaCxjWrR6kJAOlTyM9yIasWP4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: works, error: worksErr } = await supabase.from('works').select('*');
  if (worksErr) {
    console.error('Error fetching works:', worksErr);
    return;
  }
  
  console.log('--- WORKS ---');
  works.forEach(w => {
    console.log(`ID: ${w.id} | Title: ${w.title} | Ep Count: ${w.episode_count}`);
  });
  
  const targetWork = works.find(w => w.title.includes('개방의 봉황') || w.title.includes('개방'));
  if (!targetWork) {
    console.log('Target work not found.');
    return;
  }
  
  console.log(`\nFetching episodes for work: ${targetWork.title} (${targetWork.id})`);
  const { data: episodes, error: epsErr } = await supabase
    .from('episodes')
    .select('*')
    .eq('work_id', targetWork.id)
    .order('id', { ascending: true });
    
  if (epsErr) {
    console.error('Error fetching episodes:', epsErr);
    return;
  }
  
  console.log(`\n--- EPISODES (${episodes.length} found) ---`);
  episodes.forEach(ep => {
    console.log(`ID: ${ep.id} | Title: ${ep.title} | Release Date: ${ep.release_date}`);
  });
}

run().catch(console.error);
