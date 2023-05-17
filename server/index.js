import express from 'express';
import { Server } from 'socket.io';

const app = express();
const io = new Server( 8801, {
    cors: true
});

app.use(express.json());

function generateRandomRoomId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let roomId = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      roomId += characters.charAt(randomIndex);
    }
  
    return roomId;
}

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
    console.log(`Socket Connected`, socket.id);

    socket.on("create:room", ({ email }) => {
      emailToSocketIdMap.set(email, socket.id);
      socketidToEmailMap.set(socket.id, email);
      const roomId = generateRandomRoomId(5);
      io.to(roomId).emit("user:joined", { email, id: socket.id });
      io.to(socket.id).emit("create:room", { email, roomId});
      socket.join(roomId);
    })

    socket.on("room:join", (data) => {
      const { email, roomId } = data;
      emailToSocketIdMap.set(email, socket.id);
      socketidToEmailMap.set(socket.id, email);
      io.to(roomId).emit("user:joined", { email, id: socket.id });
      socket.join(roomId);
      io.to(socket.id).emit("room:join", data);
    });
  
    socket.on("user:call", ({ to, offer }) => {
      const email = socketidToEmailMap.get(socket.id);
      io.to(to).emit("incomming:call", { from: socket.id, offer, email });
    });
  
    socket.on("call:accepted", ({ to, ans }) => {
      io.to(to).emit("call:accepted", { from: socket.id, ans });
    });
  
    socket.on("peer:nego:needed", ({ to, offer }) => {
      console.log("peer:nego:needed", offer);
      io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });
  
    socket.on("peer:nego:done", ({ to, ans }) => {
      console.log("peer:nego:done", ans);
      io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });
  });

app.listen( 8800, () => {
    console.log("server listening on port 8800");
})

// io.listen( 8801 );