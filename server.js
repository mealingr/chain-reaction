const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { createGrid, canAddBomb, addBomb, getWinner } = require("./game");

const games = {};

app.get('/:gameId', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/resources/client.css', function(req, res) {
  res.sendFile(__dirname + "/client.css");
});

app.get('/resources/explosion.png', function(req, res) {
  res.sendFile(__dirname + "/explosion.png");
});

app.get('/resources/explosion.mp3', function(req, res) {
  res.sendFile(__dirname + "/explosion.mp3");
});

app.get('/resources/won.jpg', function(req, res) {
  res.sendFile(__dirname + "/won.jpg");
});

app.get('/resources/lost.jpg', function(req, res) {
  res.sendFile(__dirname + "/lost.jpg");
});

app.get('/resources/bundle.js', function(req, res) {
  res.sendFile(__dirname + "/bundle.js");
});

io.of("/").adapter.on("join-room", (room, id) => {
  if (room === id) {
    return;
  }
  console.log(`Player ${id} connected to game ${room}.`);

  let game = games[room];
  if (!game) {
    game = { turn: 0, grid: createGrid(), players: [], activePlayers: new Set() };
    games[room] = game;
  }
  game.players.push(id);
  io.to(room).emit('state',
      JSON.stringify({ currentPlayer: getCurrentPlayer(game), grid: game.grid },
          (key, value) => key === 'neighbors' ? '' : value));
});

function getCurrentPlayer(game) {
  return game.players[game.turn % game.players.length];
}

io.on('connection', (socket) => {
  const url = socket.handshake.headers.referer;
  const paths = url.split('/');
  const gameId = paths[3];
  socket.on('add_bomb', (json) => {
    const position = JSON.parse(json);
    const game = games[gameId];
    const currentPlayer = getCurrentPlayer(game);
    const cell = game.grid[position.row][position.column];
    if (socket.id === currentPlayer && canAddBomb(currentPlayer, cell)) {
      addBomb(currentPlayer, cell);
      console.log(`Player ${socket.id} in game ${gameId} added bomb to ${position.row}, ${position.column}.`);
      game.activePlayers.add(currentPlayer);
      const winner = getWinner(game.grid);
      if (game.activePlayers.size > 1 && winner) {
        game.winner = winner;
      }
      io.to(gameId).emit('add_bomb', json);
      game.turn++;
    }
  });
  socket.on('get_state', () => {
    const game = games[gameId];
    io.to(socket.id).emit('state', JSON.stringify({ currentPlayer: getCurrentPlayer(game), grid: game.grid },
        (key, value) => key === 'neighbors' ? '' : value));
  });
  socket.on('disconnect', () => {
    console.log(`Player ${socket.id} disconnected from game ${gameId}.`);
    const game = games[gameId];
    game.players = game.players.filter(player => player !== socket.id);
    game.activePlayers.delete(socket.id);
    if (game.players.length === 0) {
      delete games[gameId];
    }
  });
  socket.join(gameId);
});

server.listen(80, () => {
  console.log('Listening on port 80.');
  console.log('http://localhost/1');
});
