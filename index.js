require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Room = require('./model/Room');
const routes = require('./routes/routes');
const {
  joinRoom,
  leaveRoom,
} = require('./socket-utils/utils');

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
mongoose.connect(process.env.DB_KEY);
const database = mongoose.connection;
database.on('error', (error) => {
  console.log(error)
});
database.once('connected', () => {
  console.log('Database Connected');
});
// api routes
app.use(routes);
// socket.io functionality
io.on('connection', (socket) => {
  socket.on('join_room', async ({ room, username }) => {
    try {
      const startingCoords = {
        x: 500,
        y: 1000,
      };
      const secondaryCoords = {
        x: 1000,
        y: 1000,
      };
      const thirdCoords = {
        x: 1500,
        y: 1500,
      }
      const fourthCoords = {
        x: 500,
        y: 500
      }
      const fifthCoords = {
        x: 1000,
        y: 500,
      }
      const sixthCoords = {
        x: 1000,
        y: 1500,
      }
      await joinRoom(socket.id, username, room);
      await Room.updateOne(
        { _id: room },
        {
          $push: {
            users: { id: socket.id, username, direction: 'down', x: 500, y: 500 },
          }
        },
      );
      const rooms = await Room.find();
      const theRoom = await Room.findById(room);
      let userCoords;
      if (theRoom.gameUsers.length === 0) {
        userCoords = startingCoords;
      }
      theRoom.gameUsers.forEach((theUser) => {
        if (theUser.startingCoords && theUser.startingCoords.x === startingCoords.x && theUser.startingCoords.y === startingCoords.y) {
          userCoords = secondaryCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === secondaryCoords.x && theUser.startingCoords.y === secondaryCoords.y) {
          userCoords = thirdCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === thirdCoords.x && theUser.startingCoords.y === thirdCoords.y) {
          userCoords = fourthCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === fourthCoords.x && theUser.startingCoords.y === fourthCoords.y) {
          userCoords = fifthCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === thirdCoords.x && theUser.startingCoords.y === thirdCoords.y) {
          userCoords = sixthCoords;
          return;
        } else {
          userCoords = startingCoords;
          return;
        }
      });
      await Room.updateOne(
          { _id: room },
          {
            $push: {
            gameUsers: {id: socket.id, username, direction: 'down', startingCoords: {x: userCoords.x, y: userCoords.y}}
            }
          }
        )
      await socket.emit('update_coords', userCoords)
      await socket.join(room);
      io.in(room).emit('updatedRoom', theRoom);
      io.emit('updatedRooms', rooms);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('updateRooms', async() => {
    try {
      const data = await Room.find();
      io.emit('updatedRooms', data)
    } catch (err) {
      socket.emit('server_err', err);
    } 
  });
  socket.on('leave_room', async (data) => {
    try {
      await leaveRoom(socket.id);
      await Room.updateOne(
        { _id: data.id },
        {
          $pull: {
            users: { id: socket.id },
            gameUsers: {id: socket.id},
          }
        }
      );
      const theRoom = await Room.findById(data.id);
      await socket.leave(data.id);
      socket.to(data.id).emit('playerLeft', socket.id);
      if (theRoom.users.length < 2) {
        socket.to(data.id).emit('cant_start');
      }
      if (theRoom.users.length === 0) {
        await Room.updateOne(
          { _id: data.id },
          { started: false }
        );
      }
      io.in(data.id).emit('updatedRoom', theRoom);
      const rooms = await Room.find();
      io.emit('updatedRooms', rooms);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('disconnecting', async () => {
    try {
      const pUser = await leaveRoom(socket.id);
       await Room.updateOne(
        { _id: pUser.room },
        {
          $pull: {
            users: { id: socket.id },
            gameUsers: {id: socket.id},
          }
        }
      );
      if (pUser) {
        await socket.leave(pUser.room);
      }
      const rooms = Rooms.find();
      io.emit('updatedRooms', rooms);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  // game methods
  socket.on('join_home', async (data) => {
    try {
      await socket.to(data.room).emit('new_player', {username: data.username, socketId: socket.id});
      const usersInRoom = await Room.findById(data.room);
      const otherUsers = usersInRoom.users.filter((theUser) => theUser.id !== socket.id);
      if (otherUsers.length > 0) {
        await socket.emit('existingPlayers', otherUsers);
      }
      if (usersInRoom.users.length >= 2) {
        await io.in(data.room).emit('can_start');
      }
    } catch (err) {
        socket.emit('server_err', err);
    }
  });
  socket.on('start_game', async (room) => {
    try {
      await Room.updateOne(
        { _id: room },
        { started: true },
      );
      const rooms = Room.find();
      await socket.to(room).emit('play_game');
      io.emit('updatedRooms', rooms);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('home_game', async (data) => {
    try {
      const gameUsers = await Room.findById(data.room)
      const otherUsers = await gameUsers.gameUsers.filter((theUser) => theUser.id !== socket.id);
      await socket.emit('existing_game_players', otherUsers);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  // user communication
  socket.on('chat', async ({ username, message, date, room }) => {
    try {
      io.in(room).emit('chat_msg', { username, message, date });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  // home scene movements
  socket.on('moveHome', async ({ x, y, direction, room }) => {
    try {
      await Room.updateOne(
        { _id: room, "users.id": socket.id },
        { $set: { "users.$.x": x, "users.$.y": y, "users.$.direction": direction } }
      );
      socket.to(room).emit('playerMoveHome', { x, y, direction, socketId: socket.id });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('moveHomeEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('moveHomeEnd', {direction, socketId: socket.id});
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  // main game movements
  socket.on('move', async ({ x, y, direction, room, respawn }) => {
    try {
      socket.to(room).emit('playerMove', { x, y, direction, socketId: socket.id, respawn });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('moveEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('playerMoveEnd', {direction, socketId: socket.id});
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('shoot', async ({ x, y, direction, room }) => {
    try {
      await socket.to(room).emit('bulletShot', { x, y, direction });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('end_game_scores', async (id) => {
    try {
      const data = await Room.findById(id);
      socket.emit('all_scores', data.score);
    } catch (err) {
      socket.emit('server_err', err);
    }
  })
  socket.on('return_to_lobby', async ({ room }) => {
    try {
      io.in(room).emit('lobby');
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('GameOver', async (room) => {
    try {
      await Room.deleteOne({ _id: room });
      socket.to(room).emit('EndScene');
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
});

server.listen(port, () => console.log(`Server running on http://localhost:${port}`));