const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

function splitTextIntoParts(text, maxLen = 3000) {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  let currentPart = [];
  let currentLength = 0;

  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (paragraph.length === 0) continue;

    if (currentLength + paragraph.length + (currentPart.length > 0 ? 1 : 0) > maxLen) {
      if (currentPart.length > 0) {
        parts.push(currentPart.join('\n'));
        currentPart = [];
        currentLength = 0;
      }

      if (paragraph.length > maxLen) {
        const sentences = paragraph.replace(/([.!?])\s+/g, '$1|').split('|');
        for (let sentence of sentences) {
          sentence = sentence.trim();
          if (sentence.length === 0) continue;

          if (currentLength + sentence.length + (currentPart.length > 0 ? 1 : 0) > maxLen) {
            if (currentPart.length > 0) {
              parts.push(currentPart.join(' '));
              currentPart = [];
              currentLength = 0;
            }

            if (sentence.length > maxLen) {
              let offset = 0;
              while (offset < sentence.length) {
                const chunk = sentence.substring(offset, offset + maxLen);
                parts.push(chunk);
                offset += maxLen;
              }
            } else {
              currentPart.push(sentence);
              currentLength = sentence.length;
            }
          } else {
            currentPart.push(sentence);
            currentLength += sentence.length + (currentPart.length > 1 ? 1 : 0);
          }
        }
      } else {
        currentPart.push(paragraph);
        currentLength = paragraph.length;
      }
    } else {
      currentPart.push(paragraph);
      currentLength += paragraph.length + (currentPart.length > 1 ? 1 : 0);
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart.join('\n'));
  }

  return parts;
}

function runTtsScript(args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'tts_generator.py');
    const pythonProcess = spawn('python', [scriptPath, ...args], {
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Python exit code: ${code}`));
    });
  });
}

async function start() {
  const workId = 'yajangsingeom';
  const folderPath = path.join(process.cwd(), '야장신검');
  
  // Get voice settings from work
  const { data: work } = await supabase.from('works').select('*').eq('id', workId).single();
  const voice = work.last_voice || 'ko-KR-InJoonNeural';
  const pitch = work.last_pitch || '+0Hz';
  const rate = work.last_rate || '+0%';
  const effect = 'none';

  console.log(`Starting TTS regeneration for '${workId}' with settings: Voice=${voice}, Pitch=${pitch}, Rate=${rate}`);

  // Fetch episodes 7 to 28
  const { data: episodes } = await supabase
    .from('episodes')
    .select('*')
    .eq('work_id', workId)
    .order('id', { ascending: true });

  const targetEpisodes = episodes.filter(e => {
    const num = parseInt(e.id, 10);
    return num >= 7 && num <= 28;
  });

  console.log(`Found ${targetEpisodes.length} episodes to regenerate (7 to 28).`);

  for (const ep of targetEpisodes) {
    const epNum = parseInt(ep.id, 10);
    const epPadded = String(epNum).padStart(3, '0');
    const textFileName = `${epPadded}화_야장신검.txt`;
    const textFilePath = path.join(folderPath, textFileName);

    if (!fs.existsSync(textFilePath)) {
      console.log(`[-] Text file not found for episode ${ep.id}: ${textFilePath}`);
      continue;
    }

    console.log(`\n[*] Processing Episode ${ep.id}: ${ep.title}...`);
    const text = fs.readFileSync(textFilePath, 'utf-8');
    const parts = splitTextIntoParts(text, 3000);
    console.log(`    Split into ${parts.length} parts.`);

    const folder = String(epNum).padStart(3, '0');
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

    for (let i = 0; i < parts.length; i++) {
      const partText = parts[i];
      const partNum = i + 1;
      const partPadded = String(partNum).padStart(2, '0');

      const tempTxtPath = path.join(os.tmpdir(), `regen_${uniqueId}_p${partPadded}.txt`);
      const tempMp3Path = path.join(os.tmpdir(), `regen_${uniqueId}_p${partPadded}.mp3`);

      fs.writeFileSync(tempTxtPath, partText, 'utf-8');

      const ttsArgs = [
        `--text-file=${tempTxtPath}`,
        `--voice=${voice}`,
        `--pitch=${pitch}`,
        `--rate=${rate}`,
        `--effect=${effect}`,
        `--output=${tempMp3Path}`
      ];

      console.log(`    [Part ${partNum}/${parts.length}] Running TTS...`);
      try {
        await runTtsScript(ttsArgs);
        
        if (!fs.existsSync(tempMp3Path)) {
          throw new Error('MP3 file was not generated');
        }

        // Upload to R2
        const r2Key = `${workId}/${folder}/${partPadded}.MP3`;
        console.log(`    [Part ${partNum}/${parts.length}] Uploading to R2: ${r2Key}...`);
        const mp3Buffer = fs.readFileSync(tempMp3Path);
        
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'murimbook-audio',
            Key: r2Key,
            Body: mp3Buffer,
            ContentType: 'audio/mpeg'
          })
        );
      } catch (err) {
        console.error(`    [Error] Failed to process Part ${partNum}:`, err.message);
        continue;
      } finally {
        if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
        if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
      }
    }

    // Update database
    console.log(`    [*] Updating Supabase parts count to ${parts.length} for Episode ${ep.id}...`);
    const { error: updateError } = await supabase
      .from('episodes')
      .update({ parts: parts.length })
      .eq('work_id', workId)
      .eq('id', ep.id);

    if (updateError) {
      console.error(`    [Error] Database update failed:`, updateError.message);
    } else {
      console.log(`    [+] Episode ${ep.id} successfully updated to ${parts.length} parts!`);
    }
  }

  console.log('\n[Done] TTS regeneration completed successfully.');
}

start().catch(console.error);
