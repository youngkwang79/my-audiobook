
const fs = require('fs');
const path = 'useGameStore.ts';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { from: '??몄구??', to: '생명력' },
  { from: '??용궗', to: '내공' },
  { from: '怨듦꺽??', to: '공격력' },
  { from: '諛⑹뼱??', to: '방어력' },
  { from: '移섎챸?€ ?뺣쪧', to: '치명타 확률' },
  { from: '移섎챸?€ ?쇳빐', to: '치명타 피해' },
  { from: '?뚰뵾??', to: '회피율' },
  { from: '湲곗슫/?됱슫', to: '기운/행운' },
  { from: '?섎젴 ?⑥쑉', to: '수련 효율' },
  { from: '?섎젴 ?쒓컙', to: '수련 시간' }
];

replacements.forEach(r => {
  content = content.split(r.from).join(r.to);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed more mojibake');
