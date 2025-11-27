// Simple WebSocket signaling server for WebRTC
import { WebSocketServer } from 'ws';

const server = new WebSocketServer({ port: 8080 });

const rooms = {};

server.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }
    if (data.type === 'join') {
      currentRoom = data.room;
      rooms[currentRoom] = rooms[currentRoom] || [];
      rooms[currentRoom].push(socket);
    } else if (data.type === 'signal' && currentRoom) {
      // Broadcast signaling data to all peers in the room except sender
      rooms[currentRoom].forEach((peer) => {
        if (peer !== socket && peer.readyState === WebSocketServer.OPEN) {
          peer.send(JSON.stringify({ type: 'signal', data: data.data }));
        }
      });
    }
  });

  socket.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((s) => s !== socket);
      if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
    }
  });
});

console.log('WebSocket signaling server running on ws://localhost:8080');
