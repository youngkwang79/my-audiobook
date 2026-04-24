
const fs = require('fs');
const path = require('path');
const filePath = path.join('d:', '소설 유투브', 'my-audiobook', 'my_audiobook', 'app', 'lib', 'game', 'useGameStore.ts');

let content = fs.readFileSync(filePath, 'utf8');

const newFormatter = `export function formatCompactNumber(num: number): string {
  if (num < 0) return "0";
  if (num < 10000) return Math.floor(num).toLocaleString();
  if (num < 100000000) {
    return (num / 10000).toFixed(1).replace(/\\.0$/, "") + "만";
  }
  if (num < 1000000000000) {
    return (num / 100000000).toFixed(1).replace(/\\.0$/, "") + "억";
  }
  if (num < 10000000000000000) {
    return (num / 1000000000000).toFixed(1).replace(/\\.0$/, "") + "조";
  }
  return (num / 10000000000000000).toFixed(1).replace(/\\.0$/, "") + "경";
}`;

content = content.replace(/export function formatCompactNumber\([\s\S]*?}/, newFormatter);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Number formatter updated to Korean units');
