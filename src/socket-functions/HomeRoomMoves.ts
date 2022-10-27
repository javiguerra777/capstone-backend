import handleError from "../utils/error";
import Room from "../model/Room";

export const moveHome = (socket) => {
  socket.on('moveHome', async ({ x, y, direction, room }) => {
    try {
      await Room.updateOne(
        { _id: room, "users.id": socket.id },
        { $set: { "users.$.x": x, "users.$.y": y, "users.$.direction": direction } }
      );
      socket.to(room).emit('playerMoveHome', { x, y, direction, socketId: socket.id });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export const moveHomeEnd = (socket) => {
  socket.on('moveHomeEnd', async ({ direction, room }) => {
    try {
      socket.to(room).emit('moveHomeEnd', {direction, socketId: socket.id});
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}