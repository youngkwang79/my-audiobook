const fs = require("fs");
const path = require("path");
const os = require("os");

function copyToDesktop() {
  const src = "d:\\소설 유투브\\my-audiobook\\my_audiobook\\public\\thumbnails\\myeolsagwirim_chomuyeong.png";
  const homeDir = os.homedir();
  
  // 일반적인 바탕화면 경로들 후보
  const destCandidates = [
    path.join(homeDir, "Desktop"),
    path.join(homeDir, "바탕 화면"),
    path.join(homeDir, "OneDrive", "Desktop"),
    path.join(homeDir, "OneDrive", "바탕 화면")
  ];

  let copied = false;
  for (const destDir of destCandidates) {
    if (fs.existsSync(destDir)) {
      const destPath = path.join(destDir, "myeolsagwirim_chomuyeong.png");
      try {
        fs.copyFileSync(src, destPath);
        console.log(`Successfully copied to Desktop: ${destPath}`);
        copied = true;
        break;
      } catch (err) {
        console.error(`Failed to copy to: ${destPath}`, err);
      }
    }
  }

  if (!copied) {
    console.error("Could not find Desktop directory or failed to copy.");
  }
}

copyToDesktop();
