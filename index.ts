require('dotenv').config();
import express from 'express';
import mongoose from "mongoose";
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './src/routes/routes';
import { returnToLobby, updateRooms } from './src/socket-functions/Rooms';
import { endGame, gameOver, homeGame, joinHome, startGame } from './src/socket-functions/Game';
import { chat } from './src/socket-functions/Communication';
import { moveHome, moveHomeEnd } from './src/socket-functions/HomeRoomMoves';
import { move, moveEnd, shoot } from './src/socket-functions/MainMove';
import leaveLobby from './src/socket-functions/LeaveRoom';
import disconnecting from './src/socket-functions/Disconnecting';
import joinGame from './src/socket-functions/JoinRoom';

const app = express();
const server = http.createServer(app);
// using middleware
app.use(cors());
app.use(express.json());
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});
const port = process.env.PORT || 5000;
// connecting database
mongoose.connect(process.env.DB_KEY ||'');
const database = mongoose.connection;
database.on('error', (error) => {
  console.log(error)
});
database.once('connected', () => {
  console.log('Database Connected');
});
// api routes
app.use(routes);
// socket.io functionality and handling rooms
io.on('connection', (socket) => {
  // console.log('user joined', socket.id);
  socket.emit('myId', socket.id);
  joinGame(socket, io);
  updateRooms(socket, io);
  leaveLobby(socket, io);
  disconnecting(socket, io);
  // game methods
  joinHome(socket, io);
  startGame(socket, io);
  homeGame(socket);
  // user communication
  chat(socket, io);
  // home scene movements
  moveHome(socket);
  moveHomeEnd(socket);
  // main game movements
  move(socket);
  moveEnd(socket);
  shoot(socket);
  // handing end game scene
  endGame(socket);
  returnToLobby(socket, io);
  gameOver(socket);
});

server.listen(port, () => console.log(`Server running on http://localhost:${port}`));