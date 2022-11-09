import handleError from "../utils/error";
import Room from "../model/Room";
import { leaveRoom } from "../socket-utils/utils";

const leaveLobby = (socket, io) => {
  socket.on('leave_room', async (data) => {
    try {
      await leaveRoom(socket.id);
      await Room.updateOne(
        { _id: data.id },
        {
          $pull: {
            users: { id: socket.id },
            gameUsers: { id: socket.id },
          }
        }
      );
      const theRoom = await Room.findById(data.id);
      await socket.leave(data.id);
      socket.to(data.id).emit('playerLeft', socket.id);
      if (theRoom?.users.length === 0) {
        await Room.updateOne(
          { _id: data.id },
          { started: false }
        );
      }
      io.in(data.id).emit('updatedRoom', theRoom);
      const rooms = await Room.find();
      io.emit('updatedRooms', rooms);
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export default leaveLobby;