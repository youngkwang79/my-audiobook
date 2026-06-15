import { cleanTitleForThumbnail } from "./stringHelpers";

// AI로 생성된 썸네일 이미지 위에 한글 제목과 장르/태그 오버레이하는 함수
export async function drawTitleOnThumbnail(
  imageUrl: string,
  title: string,
  subtitle: string,
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    // 1. 구글 폰트 로딩 대기
    try {
      if (typeof window !== "undefined" && (document as any).fonts) {
        await (document as any).fonts.ready;
      }
    } catch (e) {
      console.warn("Fonts ready promise failed:", e);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl + (imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = img.naturalWidth || 768;
        const height = img.naturalHeight || 1024;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }

        // 베이스 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // 하단 부드러운 검은색 그라데이션 오버레이 (영화 포스터 스타일, 시인성 확보)
        const bottomGradient = ctx.createLinearGradient(
          0,
          height * 0.6,
          0,
          height,
        );
        bottomGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        bottomGradient.addColorStop(0.35, "rgba(0, 0, 0, 0.55)");
        bottomGradient.addColorStop(0.7, "rgba(0, 0, 0, 0.85)");
        bottomGradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const titleFontFamily =
          "'Noto Serif KR', 'Nanum Myeongjo', 'Batang', 'Georgia', serif";

        // 제목 및 부제목 파싱 (중요도에 따라 글씨 크기를 조절하기 위한 분할)
        let mainTitle = cleanTitleForThumbnail(title);
        let subTitleText = "";

        // 구분자(: 또는 -) 기준 분할
        const separators = [":", "-", "–", "—"];
        let splitIndex = -1;
        for (const sep of separators) {
          const idx = mainTitle.indexOf(sep);
          if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
            splitIndex = idx;
          }
        }

        if (splitIndex !== -1) {
          subTitleText = mainTitle.substring(splitIndex + 1).trim();
          mainTitle = mainTitle.substring(0, splitIndex).trim();
        } else {
          // 구분자가 없으나 띄어쓰기가 있고 7자 이상인 경우 똑똑하게 1차 분할
          const words = mainTitle.split(/\s+/);
          if (words.length >= 3) {
            // 예: "개방의 봉황 맹을 바로 세우다!" -> "개방의 봉황" / "맹을 바로 세우다!"
            mainTitle = words.slice(0, 2).join(" ");
            subTitleText = words.slice(2).join(" ");
          } else if (words.length === 2) {
            // 예: "멸사귀림 초무영" -> "멸사귀림" / "초무영"
            mainTitle = words[0];
            subTitleText = words[1];
          }
        }

        // 글씨 크기 동적 결정 (60대 시니어도 가독할 수 있도록 최대한 크게)
        // 메인 타이틀 크기 결정 (가로폭의 95% 범위 내 최대화, 한계치 22%)
        let mainFontSize = Math.floor(
          Math.min((width * 0.95) / mainTitle.length, width * 0.22),
        );
        if (mainFontSize < 60) mainFontSize = 60; // 최소 크기 보장 크게 조정

        if (subTitleText) {
          // 부제목 크기 결정 (가로폭 95% 범위 내 최대화, 한계치 8%)
          let subFontSize = Math.floor(
            Math.min((width * 0.95) / subTitleText.length, width * 0.08),
          );
          if (subFontSize < 30) subFontSize = 30; // 최소 크기 보장 크게 조정

          const mainY = height * 0.79;
          const subY = height * 0.89;

          // --- 메인 제목 그리기 ---
          ctx.font = `900 ${mainFontSize}px ${titleFontFamily}`;

          // 메인 그라데이션 브러시
          const mainGradient = ctx.createLinearGradient(
            0,
            mainY - mainFontSize * 0.6,
            0,
            mainY + mainFontSize * 0.6,
          );
          mainGradient.addColorStop(0, "#ffffff"); // 맨 위는 흰색 광택
          mainGradient.addColorStop(0.25, "#fce881"); // 밝은 골드
          mainGradient.addColorStop(0.7, "#cba135"); // 중후한 골드
          mainGradient.addColorStop(1, "#846014"); // 어두운 베이스 골드

          // 그림자 및 외곽선 효과 적용
          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 5;

          ctx.lineWidth = mainFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.lineWidth = mainFontSize * 0.05;
          ctx.strokeStyle = "#1a1100";
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.fillStyle = mainGradient;
          ctx.fillText(mainTitle, width / 2, mainY);

          // --- 부제목 그리기 ---
          ctx.font = `bold ${subFontSize}px ${titleFontFamily}`;

          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 3;

          ctx.lineWidth = subFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(subTitleText, width / 2, subY);

          ctx.fillStyle = "#ffe285"; // 부드러운 골드 옐로우
          ctx.fillText(subTitleText, width / 2, subY);
        } else {
          // 부제목이 없는 경우: 단일 제목 배치
          const mainY = height * 0.84;

          ctx.font = `900 ${mainFontSize}px ${titleFontFamily}`;

          const mainGradient = ctx.createLinearGradient(
            0,
            mainY - mainFontSize * 0.6,
            0,
            mainY + mainFontSize * 0.6,
          );
          mainGradient.addColorStop(0, "#ffffff");
          mainGradient.addColorStop(0.25, "#fce881");
          mainGradient.addColorStop(0.7, "#cba135");
          mainGradient.addColorStop(1, "#846014");

          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 5;

          ctx.lineWidth = mainFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.lineWidth = mainFontSize * 0.05;
          ctx.strokeStyle = "#1a1100";
          ctx.strokeText(mainTitle, width / 2, mainY);

          ctx.fillStyle = mainGradient;
          ctx.fillText(mainTitle, width / 2, mainY);
        }

        // 장르/태그 오버레이 추가 (중상단)
        if (subtitle) {
          const tagY = height * 0.12;
          const tagFontSize = Math.floor(width * 0.045);
          ctx.font = `bold ${tagFontSize}px ${titleFontFamily}`;
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;

          ctx.lineWidth = tagFontSize * 0.2;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(subtitle, width / 2, tagY);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(subtitle, width / 2, tagY);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob returned null"));
          }
        }, "image/jpeg", 0.9);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = (e) => {
      reject(new Error("Failed to load image for canvas overlay: " + JSON.stringify(e)));
    };
  });
}
