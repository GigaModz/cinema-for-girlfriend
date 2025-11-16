const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Serve static files
app.use(express.static('public'));

// Store connected players
const players = {};
let videoState = {
  action: 'pause',
  currentTime: 0
};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinGame', (data) => {
    players[socket.id] = {
      id: socket.id,
      position: { x: 0, y: 1.6, z: 5 },
      rotation: { x: 0, y: 0 },
      isSitting: false,
      color: data.color
    };

    // Send existing players to new player
    socket.emit('currentPlayers', players);

    // Send current video state to new player
    socket.emit('videoSync', videoState);

    // Notify other players about new player
    socket.broadcast.emit('playerJoined', players[socket.id]);
  });

  // Handle player movement
  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  // Handle sitting state
  socket.on('playerSit', (isSitting) => {
    if (players[socket.id]) {
      players[socket.id].isSitting = isSitting;
      socket.broadcast.emit('playerSitChanged', {
        id: socket.id,
        isSitting: isSitting
      });
    }
  });

  // Handle video control
  socket.on('videoControl', (data) => {
    console.log('Received videoControl event:', data);
    videoState = data;
    // Broadcast video control to all clients
    io.emit('videoSync', videoState);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎮 Server running on http://localhost:${PORT}`);
});
