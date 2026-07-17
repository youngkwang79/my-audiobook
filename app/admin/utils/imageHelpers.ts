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

    img.src = imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")
      ? imageUrl
      : imageUrl + (imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}
