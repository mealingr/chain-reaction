const { io } = require('socket.io-client');
const { setNeighbors, addBomb, getWinner } = require("./game");
const EXPLOSION_IMAGE = new Image();
EXPLOSION_IMAGE.src = '../resources/explosion.png';
const EXPLOSION_AUDIO = new Audio('../resources/explosion.mp3');
EXPLOSION_AUDIO.playbackRate = 2;

let socket;
let rows;
let columns;
let state;
const activePlayers = new Set();

function initialize() {
  setupWebSocket();
  addCanvasClickEventListener();
}

function setupWebSocket() {
  socket = io();
  socket.on('state', json => {
    state = JSON.parse(json);
    setNeighbors(state.grid);
    draw(state.currentPlayer, state.grid);
  });
  socket.on('add_bomb', async json => {
    activePlayers.add(state.currentPlayer);
    const position = JSON.parse(json);
    console.log(`Player ${state.currentPlayer} added bomb to ${position.row}, ${position.column}.`);
    await addBomb(state.currentPlayer, state.grid[position.row][position.column], onExplode);
    draw(state.currentPlayer, state.grid);
    socket.emit('get_state');
    const winner = getWinner(state.grid);
    if (activePlayers.size > 1 && winner) {
      if (winner === socket.id) {
        window.location.href = '/resources/won.jpg';
      }
      else {
        window.location.href = '/resources/lost.jpg';
      }
    }
  });
}

async function onExplode(cell) {
  cell.exploding = true;
  draw(state.currentPlayer, state.grid);
  await playAudio(EXPLOSION_AUDIO);
  cell.exploding = false;
  draw(state.currentPlayer, state.grid);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function playAudio(audio){
  return new Promise(res=>{
    audio.play()
    audio.onended = res
  })
}

function addCanvasClickEventListener() {
  const canvas = document.getElementById('canvas');
  canvas.addEventListener('click', function(e) {
    const { cellWidth, cellHeight } = getCellWidthAndHeight();
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    const row = Math.floor(y / cellHeight);
    const col = Math.floor(x / cellWidth);
    cellClicked(row, col);
  });
}

function draw(currentPlayer, grid) {
  rows = grid.length;
  columns = grid[0].length;
  const canvas = document.getElementById('canvas');
  fitCanvasToWindow(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, currentPlayer, grid);
}

function fitCanvasToWindow(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawGrid(ctx, currentPlayer, grid) {
  const { cellWidth, cellHeight } = getCellWidthAndHeight();
  for (let [row, cells] of grid.entries()) {
    for (let [column, cell] of cells.entries()) {
      ctx.beginPath();
      ctx.strokeStyle = stringToColor(currentPlayer);
      const cellX = column * cellWidth;
      const cellY = row * cellHeight;
      ctx.rect(cellX, cellY, cellWidth, cellHeight);
      ctx.stroke();
      if (cell.exploding) {
        drawExplosion(ctx, cellX, cellY, cellWidth, cellHeight);
      }
      else {
        drawBombs(ctx, cellX, cellY, cellWidth, cellHeight, cell.bombs, stringToColor(cell.player));
      }
    }
  }
}

function drawExplosion(ctx, cellX, cellY, cellWidth, cellHeight) {
  ctx.drawImage(EXPLOSION_IMAGE, cellX, cellY, cellWidth, cellHeight);
}

function drawBombs(ctx, cellX, cellY, cellWidth, cellHeight, count, color) {
  const padding = 10;
  const radius = Math.min(cellWidth, cellHeight) / 8;
  const cellCenterX = cellX + cellWidth / 2;
  const cellCenterY = cellY + cellHeight / 2;
  if (count === 0) {
    return;
  }
  if (count === 1) {
    drawBomb(ctx, cellCenterX, cellCenterY, radius, color);
  }
  if (count === 2) {
    drawBomb(ctx, cellCenterX - radius - padding, cellCenterY, radius, color);
    drawBomb(ctx, cellCenterX + radius + padding, cellCenterY, radius, color);
  }
  if (count === 3) {
    drawBomb(ctx, cellCenterX, cellCenterY - radius - padding, radius, color);
    drawBomb(ctx, cellCenterX - radius - padding, cellCenterY + radius + padding, radius, color);
    drawBomb(ctx, cellCenterX + radius + padding, cellCenterY + radius + padding, radius, color);
  }
  if (count === 4) {
    drawBomb(ctx, cellCenterX - radius - padding, cellCenterY - radius - padding, radius, color);
    drawBomb(ctx, cellCenterX + radius + padding, cellCenterY - radius - padding, radius, color);
    drawBomb(ctx, cellCenterX - radius - padding, cellCenterY + radius + padding, radius, color);
    drawBomb(ctx, cellCenterX + radius + padding, cellCenterY + radius + padding, radius, color);
  }
}

function drawBomb(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function getCellWidthAndHeight() {
  const canvas = document.getElementById('canvas');
  const cellWidth = canvas.width / columns;
  const cellHeight = canvas.height / rows;
  return { cellWidth, cellHeight };
}

function cellClicked(row, column) {
  console.log('Cell clicked: ' + row + ', ' + column);
  socket.emit('add_bomb', JSON.stringify({ row, column }));
}

function stringToColor(string) {
  if (!string) {
    return null;
  }
  return '#' + intToRGB(hashCode(string));
}

function hashCode(string) { // java String#hashCode
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function intToRGB(i) {
  let c = (i & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();

  return "00000".substring(0, 6 - c.length) + c;
}

window.initialize = initialize;
