// Simple WebSocket signaling server for WebRTC
import { WebSocketServer } from 'ws';
import os from 'os';

const PORT = process.env.SIGNALING_PORT || 8081;
const server = new WebSocketServer({ 
  port: PORT,
  host: '0.0.0.0' // Listen on all network interfaces
});

const rooms = {};

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.on('connection', (socket) => {
  console.log('✅ New client connected');
  let currentRoom = null;
  let peerId = null;

  socket.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('❌ Failed to parse message:', e);
      return;
    }
    
    console.log('📨 Received:', data.type, peerId ? `from ${peerId}` : '', currentRoom ? `in room ${currentRoom}` : '');
    
    if (data.type === 'join') {
      currentRoom = data.room;
      peerId = data.peerId;
      socket.peerId = peerId; // Store peer ID on socket
      
      rooms[currentRoom] = rooms[currentRoom] || [];
      
      // Notify existing peers about the new peer
      const existingPeers = rooms[currentRoom].length;
      console.log(`👋 Peer ${peerId} joining room ${currentRoom} with ${existingPeers} existing peers`);
      
      rooms[currentRoom].forEach((peer) => {
        if (peer !== socket && peer.readyState === 1) {
          // Tell existing peer about new peer
          peer.send(JSON.stringify({ 
            type: 'signal', 
            data: { 
              type: 'peer-joined', 
              peerId: peerId 
            } 
          }));
          console.log(`📢 Notified peer ${peer.peerId} about ${peerId}`);
        }
      });
      
      rooms[currentRoom].push(socket);
      console.log(`✅ Peer ${peerId} joined room ${currentRoom} (${rooms[currentRoom].length} total peers)`);
      
    } else if (data.type === 'signal' && currentRoom) {
      // Forward signaling data to specific peer or broadcast
      const targetPeerId = data.data?.to;
      
      if (targetPeerId) {
        // Send to specific peer
        const targetPeer = rooms[currentRoom].find(peer => peer.peerId === targetPeerId);
        if (targetPeer && targetPeer.readyState === 1) {
          targetPeer.send(JSON.stringify({ type: 'signal', data: data.data }));
          console.log(`📡 Forwarded ${data.data.type} from ${peerId} to ${targetPeerId}`);
        } else {
          console.log(`⚠️  Target peer ${targetPeerId} not found or not ready`);
        }
      } else {
        // Broadcast to all peers in room except sender
        const peerCount = rooms[currentRoom]?.length || 0;
        console.log(`📡 Broadcasting ${data.data.type} from ${peerId} to ${peerCount - 1} peers in ${currentRoom}`);
        rooms[currentRoom].forEach((peer) => {
          if (peer !== socket && peer.readyState === 1) {
            peer.send(JSON.stringify({ type: 'signal', data: data.data }));
          }
        });
      }
    }
  });

  socket.on('close', () => {
    console.log(`🔌 Peer ${peerId} disconnected`);
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((s) => s !== socket);
      console.log(`👥 Room ${currentRoom} now has ${rooms[currentRoom].length} peers`);
      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom];
        console.log(`🧹 Room ${currentRoom} deleted (empty)`);
      }
    }
  });
});

const localIPs = getLocalIPs();
console.log('\n🎥 WebSocket Signaling Server Started!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📍 Local Access:');
console.log('   ws://localhost:' + PORT);
console.log('   ws://127.0.0.1:' + PORT);
if (localIPs.length > 0) {
  console.log('\n🌐 Network Access (for other devices):');
  localIPs.forEach(ip => {
    console.log('   ws://' + ip + ':' + PORT);
  });
  console.log('\n💡 Share this URL with peers on the same network!');
}
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
