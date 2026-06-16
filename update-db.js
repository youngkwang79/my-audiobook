const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
  const { data, error } = await supabase.from('works').select('id, thumbnail').like('thumbnail', '/api/thumbnails/%');
  if (error) {
    console.error(error);
    return;
  }
  
  for (const work of data) {
    const newThumbnail = work.thumbnail.replace('/api/thumbnails/', '/thumbnails/');
    console.log(`Updating ${work.id}: ${work.thumbnail} -> ${newThumbnail}`);
    await supabase.from('works').update({ thumbnail: newThumbnail }).eq('id', work.id);
  }
  console.log('Done');
}
update();
