const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const novels = [
  {
    titleLike: '%구파일방 천재들%',
    sourceImage: 'C:/Users/owner/.gemini/antigravity-ide/brain/561df978-aa12-4af7-98fe-0efbf3343ccb/nine_sects_underdog_1781525306390.png',
    newFileName: `gupailbang_${Date.now()}.png`
  }
];

async function updateThumbnails() {
  for (const novel of novels) {
    try {
      const { data, error } = await supabaseAdmin
        .from('works')
        .select('id, title, thumbnail')
        .ilike('title', novel.titleLike)
        .single();
      
      if (error || !data) {
        console.log(`Could not find novel matching ${novel.titleLike}:`, error?.message);
        continue;
      }

      console.log(`Found novel: ${data.title} (ID: ${data.id})`);
      
      // Copy image to public/thumbnails
      const targetPath = path.join(__dirname, '../public/thumbnails', novel.newFileName);
      fs.copyFileSync(novel.sourceImage, targetPath);
      console.log(`Copied image to ${targetPath}`);

      // Update Supabase
      const relativeUrl = `/api/thumbnails/${novel.newFileName}`;
      const { error: updateError } = await supabaseAdmin
        .from('works')
        .update({ thumbnail: relativeUrl })
        .eq('id', data.id);

      if (updateError) {
        console.error(`Failed to update DB for ${data.title}:`, updateError.message);
      } else {
        console.log(`Successfully updated DB for ${data.title} -> ${relativeUrl}`);
      }
    } catch (err) {
      console.error(`Error processing ${novel.titleLike}:`, err.message);
    }
  }
}

updateThumbnails();
