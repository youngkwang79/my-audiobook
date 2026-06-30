const text = `이것은 본문 내용입니다. 아주 재미있는 소설의 첫 부분입니다.`;
const title = "새벽의 검";
const episodeId = "1";

let fullText = text.trim();
const cleanTitle = title.trim();
let fullTitle = cleanTitle;

if (episodeId) {
  const cleanEpId = String(episodeId).trim();
  const hasEpisodeNumber = cleanTitle.includes(cleanEpId);
  if (!hasEpisodeNumber) {
    if (/^\d+$/.test(cleanEpId)) {
      fullTitle = `제 ${cleanEpId}화. ${cleanTitle}`;
    } else {
      fullTitle = `${cleanEpId}. ${cleanTitle}`;
    }
  }
}

const normalize = (s: string) => s.replace(/[^a-zA-Z0-9가-힣]/g, "");
const normText = normalize(fullText.substring(0, 150));
const normTitle = normalize(fullTitle);

console.log("Full Title:", fullTitle);
console.log("Normalized Text Prefix:", normText);
console.log("Normalized Title:", normTitle);
console.log("Includes?", normText.includes(normTitle));

if (fullTitle && !normText.includes(normTitle)) {
  fullText = `${fullTitle}.\n\n${fullText}`;
}

console.log("Resulting Text:\n", fullText);
