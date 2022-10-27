import Room from "../model/Room";
import handleError from "../utils/error"

// updates users when a new user joins room
export const joinHome = (socket, io) => {
  socket.on('join_home', async (data) => {
    try {
      await socket.to(data.room).emit('new_player', {
        username: data.username,
        socketId: socket.id
      });
      const usersInRoom = await Room.findById(data.room);
      const otherUsers = usersInRoom?.users.filter((theUser) => theUser.id !== socket.id);
      if (otherUsers && otherUsers.length > 0) {
        await socket.emit('existingPlayers', otherUsers);
      }
      if (usersInRoom && usersInRoom.users.length >= 2) {
        await io.in(data.room).emit('can_start');
      }
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}; 
// home game method
export const homeGame = (socket) => {
  socket.on('home_game', async (data) => {
    try {
      const gameUsers = await Room.findById(data.room)
      const otherUsers = await gameUsers?.gameUsers.filter((theUser) => theUser.id !== socket.id);
      await socket.emit('existing_game_players', otherUsers);
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}
// starts game for users in room
export const startGame = (socket, io) => {
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
      handleError(socket, err.message);
    }
  });
};
// ends game and deletes room
export const gameOver = (socket) => {
   socket.on('GameOver', async (room) => {
    try {
      await Room.deleteOne({ _id: room });
      socket.to(room).emit('EndScene');
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}
// display end game scores
export const endGameScores = (socket) => {
  socket.on('end_game_scores', async (id) => {
    try {
      const data = await Room.findById(id);
      socket.emit('all_scores', data?.score);
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}
