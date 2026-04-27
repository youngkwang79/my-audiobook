import random

types = ['fire','water','wind','thunder']

def initPuzzleGrid():
    newGrid = []
    for r in range(7):
        row = []
        for c in range(7):
            while True:
                t = random.choice(types)
                if r >= 2 and newGrid[r-1][c]['type'] == t and newGrid[r-2][c]['type'] == t:
                    continue
                if c >= 2 and row[c-1]['type'] == t and row[c-2]['type'] == t:
                    continue
                break
            row.append({'id': random.random(), 'type': t})
        newGrid.append(row)
    return newGrid


def findMatches(grid):
    horizontalItems = {}
    verticalItems = {}

    for r in range(7):
        count = 1
        startC = 0
        for c in range(1, 8):
            if c < 7 and grid[r][c]['type'] and grid[r][c]['type'] == grid[r][c-1]['type']:
                count += 1
            else:
                if count >= 3:
                    matchSet = set(f"{r},{i}" for i in range(startC, c))
                    horizontalItems[f"{r},{startC}-{count}"] = matchSet
                startC = c
                count = 1

    for c in range(7):
        count = 1
        startR = 0
        for r in range(1, 8):
            if r < 7 and grid[r][c]['type'] and grid[r][c]['type'] == grid[r-1][c]['type']:
                count += 1
            else:
                if count >= 3:
                    matchSet = set(f"{i},{c}" for i in range(startR, r))
                    verticalItems[f"{startR}-{count},{c}"] = matchSet
                startR = r
                count = 1

    allMatches = []
    for key, setv in horizontalItems.items():
        r, range_ = key.split(',')
        start, _ = map(int, range_.split('-'))
        coords = [tuple(map(int, s.split(','))) for s in setv]
        allMatches.append({'coords': coords, 'type': grid[int(r)][start]['type'], 'direction': 'h'})

    for key, setv in verticalItems.items():
        range_, c = key.split(',')
        start, _ = map(int, range_.split('-'))
        coords = [tuple(map(int, s.split(','))) for s in setv]
        allMatches.append({'coords': coords, 'type': grid[start][int(c)]['type'], 'direction': 'v'})

    return allMatches

for i in range(20):
    grid = initPuzzleGrid()
    matches = findMatches(grid)
    if matches:
        print('FOUND ERROR', i, matches)
        break
else:
    print('no initial matches')
