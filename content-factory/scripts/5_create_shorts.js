// content-factory/scripts/5_create_shorts.js
// 사용법: node content-factory/scripts/5_create_shorts.js --dir=folder_name --bgm=optional_bgm_path

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
let dirName = '';
let customBgm = '';

for (const arg of args) {
  if (arg.startsWith('--dir=')) {
    dirName = arg.split('=')[1];
  } else if (arg.startsWith('--bgm=')) {
    customBgm = arg.split('=')[1];
  }
}

if (!dirName) {
  console.error("❌ Error: --dir=폴더명 매개변수가 필요합니다.");
  process.exit(1);
}

const targetDir = path.resolve(__dirname, `../output/${dirName}`);
if (!fs.existsSync(targetDir)) {
  console.error(`❌ Error: 대상 폴더 '${targetDir}'가 존재하지 않습니다.`);
  process.exit(1);
}

// 1. 디렉토리 내 slide_*.png 이미지 파일 수집 및 정렬
const files = fs.readdirSync(targetDir);
const slideImages = files
  .filter(f => f.startsWith('slide_') && f.endsWith('.png'))
  .sort((a, b) => {
    const numA = parseInt(a.replace('slide_', '').replace('.png', ''), 10);
    const numB = parseInt(b.replace('slide_', '').replace('.png', ''), 10);
    return numA - numB;
  });

if (slideImages.length === 0) {
  console.error("❌ Error: 폴더 내에 slide_1.png, slide_2.png 등의 이미지 파일이 없습니다.");
  process.exit(1);
}

console.log(`📸 비디오 합성에 사용할 이미지 리스트:`, slideImages);

// 2. 배경 음악 (BGM) 매핑
let bgmPath = '';
if (customBgm && fs.existsSync(customBgm)) {
  bgmPath = customBgm;
} else {
  // 사용자가 지정한 기본 BGM 경로 (public/Steady_State.MP3)
  const defaultBgmPath = path.resolve(__dirname, '../../public/Steady_State.MP3');
  if (fs.existsSync(defaultBgmPath)) {
    bgmPath = defaultBgmPath;
  } else {
    // 윈도우 절대경로 백업 대응
    const winBackupPath = 'D:\\소설 유투브\\my-audiobook\\my_audiobook\\public\\Steady_State.MP3';
    if (fs.existsSync(winBackupPath)) {
      bgmPath = winBackupPath;
    }
  }
}

// 3. FFmpeg 명령어 구성 (크로스페이드 슬라이드 쇼 및 오디오 믹싱)
// 개당 4초씩 재생, 총 5장의 경우 약 20초 비디오 생성
const slideDuration = 4; // 각 이미지 노출 초
const fadeDuration = 0.5; // 전환 효과 초
const outputVideoPath = path.join(targetDir, 'reels_shorts.mp4');

// ffmpeg.exe 위치
const projectRoot = path.resolve(__dirname, '../../');
const ffmpegExe = path.join(projectRoot, 'ffmpeg.exe');
const ffmpegBin = fs.existsSync(ffmpegExe) ? ffmpegExe : 'ffmpeg';

function createVideo() {
  console.log(`🎬 FFmpeg 비디오 생성 중... BGM: ${bgmPath || '없음'}`);
  
  // 간단하고 강건한 ffmpeg 이미지 루프 & 오디오 합성 필터
  // 세로형 릴스 규격인 1080x1920으로 이미지들을 리사이즈 및 패딩
  // 320x400 카드를 깔끔하게 1080x1920 세로형 릴스 사이즈로 가운데에 정렬 및 배치합니다.
  const filterParts = [];
  const inputs = [];

  slideImages.forEach((img, index) => {
    inputs.push('-loop', '1', '-t', String(slideDuration), '-i', path.join(targetDir, img));
  });

  if (bgmPath) {
    inputs.push('-i', bgmPath);
  }

  // 각 이미지 입력을 1080x1920 (9:16 비율) 세로 비율에 맞게 직접 리사이즈 (여백 제거)
  slideImages.forEach((_, idx) => {
    filterParts.push(`[${idx}:v]scale=1080:1920[v${idx}];`);
  });

  // 순차적으로 이미지들을 연결(concat)
  let concatString = '';
  slideImages.forEach((_, idx) => {
    concatString += `[v${idx}]`;
  });
  filterParts.push(`${concatString}concat=n=${slideImages.length}:v=1:a=0[outv]`);

  const filterComplex = filterParts.join('');
  const totalDuration = slideImages.length * slideDuration;

  const ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[outv]'
  ];

  if (bgmPath) {
    ffmpegArgs.push(
      '-map', `${slideImages.length}:a`,
      '-c:a', 'aac',
      '-shortest',
      '-t', String(totalDuration)
    );
  }

  // 비디오 코덱 설정
  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '25',
    outputVideoPath
  );

  console.log(`🚀 실행할 FFmpeg 경로: ${ffmpegBin}`);
  
  const ffmpegProcess = spawn(ffmpegBin, ffmpegArgs);

  ffmpegProcess.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  ffmpegProcess.stderr.on('data', (data) => {
    // FFmpeg은 통계 출력을 stderr로 보냅니다
    const log = data.toString();
    if (log.includes('frame=')) {
       process.stdout.write(`\r⚙️ 렌더링 진행 상황: ${log.substring(0, 50).trim()}`);
    }
  });

  ffmpegProcess.on('close', (code) => {
    console.log('\n');
    if (code === 0) {
      console.log(`✅ [성공] 릴스/쇼츠 동영상이 생성되었습니다!`);
      console.log(`🔗 비디오 파일 위치: ${outputVideoPath}`);

      // D 드라이브 추가 백업/다운로드 복사본 경로 처리 (output_reels에만 저장)
      const exportPaths = [
        'D:\\output_reels'
      ];
      
      exportPaths.forEach(targetFolder => {
        try {
          if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
            console.log(`📁 폴더 생성 완료: ${targetFolder}`);
          }
          const destination = path.join(targetFolder, `${dirName}_reels_shorts.mp4`);
          fs.copyFileSync(outputVideoPath, destination);
          console.log(`💾 지정 경로 복사 성공: ${destination}`);
        } catch (copyErr) {
          console.error(`⚠️ ${targetFolder} 복사 중 오류 발생:`, copyErr.message);
        }
      });
    } else {
      console.error(`❌ [실패] FFmpeg 렌더링 중 오류가 발생했습니다. (ExitCode: ${code})`);
    }
  });
}

createVideo();
