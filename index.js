require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Room = require('./model/Room');

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
})

database.once('connected', () => {
    console.log('Database Connected');
})
const users = [];
// rest api functionality
app.route('/').get(async (req, res) => {
  try {
    res.status(200).json('Welcome to the videogame server');
  } catch (err) {
    res.status(400).json(err.message);
  }
});
app.route('/room/:id').get(async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Room.findById(id);
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
app.route('/rooms').get(async (req, res) => {
  try {
    const data = await Room.find();
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
app.route('/createRoom').post(async (req, res) => {
  try {
    const data = new Room({
      name: req.body.name,
      host: req.body.username,
    });
    const roomToSave = await data.save();
    res.status(200).json(roomToSave);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
// socket.io functionality
io.on('connection', (socket) => {
  // removes user from room
  function leaveRoom(id) {
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) {
      return users.splice(index, 1)[0];
    }
  }
  socket.on('join_room', async ({ room, username }) => {
    try {
      const startingCoords = {
        x: 500,
        y: 1000,
      }
      const secondaryCoords = {
        x: 1000,
        y: 1000,
      }
      await users.push({ id: socket.id, room, username });
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
      let existing = false
      theRoom.gameUsers.forEach((theUser) => {
        if (theUser.startingCoords && theUser.startingCoords.x === startingCoords.x && theUser.startingCoords.y === startingCoords.y) {
          existing = true;
        }
      });
      if (existing) {
        await Room.updateOne(
          { _id: room },
          {
            $push: {
            gameUsers: {id: socket.id, username, direction: 'down', startingCoords: {x: secondaryCoords.x, y: secondaryCoords.y}}
            }
          }
        )
        socket.emit('update_coords', secondaryCoords)
      } else {
        await Room.updateOne(
          { _id: room },
          {
            $push: {
            gameUsers: {id: socket.id, username, direction: 'down', startingCoords}
            }
          }
        )
        socket.emit('update_coords', startingCoords)
      }
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
      socket.to(data.id).emit('playerLeft');
      if (theRoom.users.length < 2) {
        socket.to(data.id).emit('cant_start');
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
  socket.on('join_game', async (data) => {
    try {
      await socket.to(data.room).emit('playerJoin', data);
      const usersInRoom = await Room.findById(data.room);
      const otherUsers = usersInRoom.users.filter((theUser) => theUser.id !== socket.id);
      if (otherUsers.length > 0) {
        await socket.emit('existingPlayer', otherUsers[0]);
      }
      if (usersInRoom.users.length === 2) {
        await io.in(data.room).emit('can_start');
      }
    } catch (err) {
        socket.emit('server_err', err);
    }
  });
  socket.on('start_game', async (room) => {
    try {
      await socket.to(room).emit('play_game');
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('home_game', async (data) => {
    try {
      const gameUsers = await Room.findById(data.room)
      const otherUsers = await gameUsers.gameUsers.filter((theUser) => theUser.id !== socket.id);
      await socket.emit('main_join', otherUsers[0]);
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
      socket.to(room).emit('playerMoveHome', { x, y, direction });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('moveHomeEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('moveHomeEnd', direction);
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  // main game movements
  socket.on('move', async ({ x, y, direction, room, respawn }) => {
    try {
      socket.to(room).emit('playerMove', { x, y, direction, respawn });
    } catch (err) {
      socket.emit('server_err', err);
    }
  });
  socket.on('moveEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('playerMoveEnd', direction);
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