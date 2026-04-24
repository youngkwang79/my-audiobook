
const fs = require('fs');
const buffer = fs.readFileSync('d:/소설 유투브/my-audiobook/my_audiobook/app/lib/game/useGameStore.ts');
console.log(buffer.slice(0, 50).toString('hex'));
