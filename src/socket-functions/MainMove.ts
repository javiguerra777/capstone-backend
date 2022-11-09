import handleError from "../utils/error";

export const move = (socket) => {
  socket.on('move', async ({ x, y, direction, room, respawn, otherSocketId }) => {
    try {
      socket.to(room).emit('playerMove', { x, y, direction, socketId: socket.id, respawn, otherSocketId: otherSocketId || '' });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export const moveEnd = (socket) => {
  socket.on('moveEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('playerMoveEnd', { direction, socketId: socket.id });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export const shoot = (socket) => {
  socket.on('shoot', async ({ x, y, direction, room }) => {
    try {
      await socket.to(room).emit('bulletShot', { x, y, direction, otherId: socket.id });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};
