// 파일명에서 회차 번호와 제목 추출하는 헬퍼 함수
export function parseFilename(filename: string) {
  // 확장자 제거 (예: .mp3, .m4a 등)
  const base = filename.substring(0, filename.lastIndexOf(".")) || filename;

  // 0. chapter_N, ep_N, episode_N 패턴 매칭
  const chapterMatch = base.trim().match(/^(?:chapter|ep|episode)[_\s.\-]*(\d+)[_\s.\-]*([\s\S]*)$/i);
  if (chapterMatch) {
    const id = chapterMatch[1];
    const title = chapterMatch[2].trim();
    return { id: String(Number(id)), title: title || `chapter_${Number(id)}` };
  }

  // 0.5. 제N화 / 제N편 패턴 매칭
  const jeMatch = base.trim().match(/^제\s*(\d+)\s*(?:화|편)?[\s\-_.]*(.*)$/);
  if (jeMatch) {
    const id = jeMatch[1];
    const title = jeMatch[2].trim();
    return { id: String(Number(id)), title: title || `제${Number(id)}화` };
  }

  // 1. "01 새벽의 검", "01 - 새벽의 검", "1화 새벽의 검", "1편 새벽의 검" 패턴 매칭
  // 숫자(1개 이상) + 선택적 "화/편" + 공백/대시/점/언더바 + 나머지 내용
  const match = base.trim().match(/^(\d+)(?:화|편)?[\s\-_.]+(.+)$/);
  if (match) {
    const id = match[1];
    const title = match[2].trim();
    return { id: String(Number(id)), title };
  }

  // 2. 숫자만 있는 패턴 (예: "01", "1화", "1편")
  const onlyNumMatch = base.trim().match(/^(\d+)(?:화|편)?$/);
  if (onlyNumMatch) {
    const id = onlyNumMatch[1];
    return { id: String(Number(id)), title: `${Number(id)}화` };
  }

  // 3. 예외 패턴 (예: "새벽의 검")
  return { id: "1", title: base.trim() };
}

// 한글 제목을 영문 고유 ID(Slug)로 변환하는 함수
export function romanizeHangeul(text: string): string {
  const choMap = [
    "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj",
    "ch", "k", "t", "p", "h",
  ];
  const jungMap = [
    "a", "ae", "ya", "yae", "eo", "e", "ye", "ye", "o", "wa", "wae", "oe",
    "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
  ];
  const jongMap = [
    "", "g", "kk", "gs", "n", "nj", "nh", "d", "l", "lg", "lm", "lb", "ls",
    "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "ng", "j", "ch", "k", "t",
    "p", "h",
  ];

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = Math.floor(offset / 21 / 28);
      const jung = Math.floor((offset % (21 * 28)) / 28);
      const jong = offset % 28;
      result += choMap[cho] + jungMap[jung] + jongMap[jong];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result.replace(/[^a-z0-9]/g, "").slice(0, 30);
}

// 괄호 안에 한자가 들어간 패턴 (반각 및 전각 괄호 포함) 자동 제거 함수
// 예: 무림(武林) -> 무림
export function cleanHanja(text: string): string {
  const hanjaInParenthesesRegex =
    /\([^\)]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+[^\)]*\)/g;
  const hanjaInParenthesesFullWidthRegex =
    /（[^）]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+[^）]*）/g;
  return text
    .replace(hanjaInParenthesesRegex, "")
    .replace(hanjaInParenthesesFullWidthRegex, "");
}

export function cleanTitleForThumbnail(text: string): string {
  let cleaned = cleanHanja(text);
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, "");
  cleaned = cleaned.replace(/[A-Za-z]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/[:\-\–\—]{2,}/g, "").trim();
  return cleaned;
}
