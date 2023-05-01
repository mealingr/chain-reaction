const DEFAULT_ROWS = 5;
const DEFAULT_COLUMNS = 6;

function createGrid(rows = DEFAULT_ROWS, columns = DEFAULT_COLUMNS) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < columns; c++) {
      row.push({ bombs: 0 });
    }
    grid.push(row);
  }
  setNeighbors(grid);
  return grid;
}

function setNeighbors(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      cell.neighbors = {};
      if (r > 0) {
        cell.neighbors.north = grid[r - 1][c];
      }
      if (c < grid[r].length - 1) {
        cell.neighbors.east = grid[r][c + 1];
      }
      if (r < grid.length - 1) {
        cell.neighbors.south = grid[r + 1][c];
      }
      if (c > 0) {
        cell.neighbors.west = grid[r][c - 1];
      }
    }
  }
}

function canAddBomb(player, cell) {
  return !cell.player || cell.player === player;
}

async function addBomb(player, cell, onExplode = cell => {
})
{
  addBombToCell(player, cell);
  const queue = [{ cell, explosions: 0 }];
  while (queue.length > 0) {
    const element = queue.pop();
    const cell = element.cell;
    const neighbors = cell.neighbors;
    const maxBombs = Object.keys(neighbors).length;
    if (cell.bombs < maxBombs) {
      continue;
    }
    element.explosions++;
    cell.bombs = 0;
    cell.player = null;
    for (const [, value] of Object.entries(neighbors)) {
      addBombToCell(player, value);
    }
    await onExplode(cell);
    for (const [, value] of Object.entries(neighbors)) {
      queue.push({ cell: value, explosions: 0 });
    }
    queue.sort((a, b) => a.explosions - b.explosions);
  }
}

function addBombToCell(player, cell) {
  cell.player = player;
  const maxBombs = Object.keys(cell.neighbors).length;
  if (cell.bombs < maxBombs) {
    cell.bombs++;
  }
}

function getWinner(grid) {
  const players = new Set();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell.player) {
        players.add(cell.player);
      }
    }
  }
  if (players.size === 1) {
    return Array.from(players)[0];
  }
  return null;
}

module.exports = {
  createGrid, canAddBomb, addBomb, setNeighbors, getWinner
}
