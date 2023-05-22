import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const PORT = 8800;

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create the Socket.IO server and attach it to the HTTP server
const io = new Server(server, {
  cors: true,
});

app.use(express.json());

// Generate a random room ID
function generateRandomRoomId(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let roomId = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    roomId += characters.charAt(randomIndex);
  }
  
  return roomId;
}

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on('create:room', ({ email }) => {
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    const roomId = generateRandomRoomId(5);
    socket.join(roomId);
    // io.to(roomId).emit('user:joined', { email, id: socket.id });
    io.to(socket.id).emit('create:room', { email, roomId });
  });

  socket.on('room:join', ({ email, roomId }) => {
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(roomId).emit('user:joined', { email, id: socket.id });
    socket.join(roomId);
    io.to(socket.id).emit('room:join', { email, roomId });
  });

  socket.on('user:call', ({ to, offer }) => {
    const email = socketidToEmailMap.get(socket.id);
    io.to(to).emit('incomming:call', { from: socket.id, offer, email });
  });

  socket.on('call:accepted', ({ to, ans }) => {
    io.to(to).emit('call:accepted', { from: socket.id, ans });
  });

  socket.on('peer:nego:needed', ({ to, offer }) => {
    console.log('peer:nego:needed', offer);
    io.to(to).emit('peer:nego:needed', { from: socket.id, offer });
  });

  socket.on('peer:nego:done', ({ to, ans }) => {
    console.log('peer:nego:done', ans);
    io.to(to).emit('peer:nego:final', { from: socket.id, ans });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
