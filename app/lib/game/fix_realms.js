
const fs = require('fs');
const path = 'useGameStore.ts';
let content = fs.readFileSync(path, 'utf8');

const realmSettings = `export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: 'straw', label: '객잔 짚더미', hp: 150, mp: 60, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: 'straw', label: '말라비틀어진 짚더미', hp: 300, mp: 150, goldMultiplier: 3 },
  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: 'wood', label: '참나무 목인', hp: 600, mp: 350, goldMultiplier: 8 },
  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: 'leather', label: '가죽 목인', hp: 1200, mp: 700, goldMultiplier: 20 },
  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: 'iron', label: '청강철 목인', hp: 2500, mp: 1500, goldMultiplier: 50 },
  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: 'spirit', label: '기운 서린 목인', hp: 5000, mp: 3000, goldMultiplier: 150 },
  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: 'master', label: '화경의 환영', hp: 12000, mp: 7000, goldMultiplier: 400 },
  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: 'legend', label: '현경의 전설', hp: 25000, mp: 15000, goldMultiplier: 1000 },
  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: 'life-death', label: '생사의 문턱', hp: 50000, mp: 35000, goldMultiplier: 2500 },
  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: 'myth', label: '신화의 형상', hp: 120000, mp: 80000, goldMultiplier: 7000 },
  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: 'heaven', label: '천인합일의 경지', hp: 300000, mp: 200000, goldMultiplier: 20000 },
};`;

// Use a regex to replace the whole REALM_SETTINGS block
content = content.replace(/export const REALM_SETTINGS: Record<string, any> = \{[\s\S]*?\};/, realmSettings);

// Fix REALM_ORDER too
const realmOrder = `export const REALM_ORDER = ['필부', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경', '생사경', '신화경', '천인합일'];`;
content = content.replace(/export const REALM_ORDER = \[[\s\S]*?\];/, realmOrder);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed useGameStore.ts realms');
