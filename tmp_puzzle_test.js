const types = ['fire','water','wind','thunder'];

function initPuzzleGrid() {
  const newGrid = [];
  for (let r = 0; r < 7; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      let t;
      do {
        t = types[Math.floor(Math.random() * types.length)];
      } while (
        (r >= 2 && newGrid[r-1][c].type === t && newGrid[r-2][c].type === t) ||
        (c >= 2 && row[c-1].type === t && row[c-2].type === t)
      );
      row.push({ id: Math.random(), type: t });
    }
    newGrid.push(row);
  }
  return newGrid;
}

function findMatches(grid) {
  const horizontalItems = new Map();
  const verticalItems = new Map();

  for (let r = 0; r < 7; r++) {
    let count = 1;
    let startC = 0;
    for (let c = 1; c <= 7; c++) {
      if (c < 7 && grid[r][c].type && grid[r][c].type === grid[r][c-1].type) {
        count++;
      } else {
        if (count >= 3) {
          const matchSet = new Set();
          for (let i = startC; i < c; i++) matchSet.add(`${r},${i}`);
          horizontalItems.set(`${r},${startC}-${count}`, matchSet);
        }
        startC = c;
        count = 1;
      }
    }
  }

  for (let c = 0; c < 7; c++) {
    let count = 1;
    let startR = 0;
    for (let r = 1; r <= 7; r++) {
      if (r < 7 && grid[r][c].type && grid[r][c].type === grid[r-1][c].type) {
        count++;
      } else {
        if (count >= 3) {
          const matchSet = new Set();
          for (let i = startR; i < r; i++) matchSet.add(`${i},${c}`);
          verticalItems.set(`${startR}-${count},${c}`, matchSet);
        }
        startR = r;
        count = 1;
      }
    }
  }

  const allMatches = [];
  horizontalItems.forEach((set, key) => {
    const [r, range] = key.split(',');
    const [start] = range.split('-').map(Number);
    const coords = Array.from(set).map(s => s.split(',').map(Number));
    allMatches.push({ coords, type: grid[Number(r)][start].type, direction: 'h' });
  });
  verticalItems.forEach((set, key) => {
    const [range, c] = key.split(',');
    const [start] = range.split('-').map(Number);
    const coords = Array.from(set).map(s => s.split(',').map(Number));
    allMatches.push({ coords, type: grid[start][Number(c)].type, direction: 'v' });
  });

  return allMatches;
}

for (let i = 0; i < 20; i++) {
  const grid = initPuzzleGrid();
  const matches = findMatches(grid);
  if (matches.length !== 0) {
    console.log('FOUND ERROR', i, matches);
    process.exit(1);
  }
}
console.log('no initial matches');
