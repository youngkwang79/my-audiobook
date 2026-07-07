const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asiuxoprpfhnknswnzal.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaXV4b3BycGZobmtuc3duemFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzMDgzOCwiZXhwIjoyMDg1ODA2ODM4fQ.EEu_HDwk9R86Us1H_aKaCxjWrR6kJAOlTyM9yIasWP4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: works, error: worksErr } = await supabase
    .from('works')
    .select('*')
    .or('title.ilike.%상속세%,title.ilike.%동거주택%');
  if (worksErr) {
    console.error('Error fetching works:', worksErr);
    return;
  }
  
  console.log('--- MATCHING WORKS ---');
  console.log(JSON.stringify(works, null, 2));
}

run().catch(console.error);

