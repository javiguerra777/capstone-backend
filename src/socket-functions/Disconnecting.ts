import handleError from "../utils/error";
import { leaveRoom } from "../socket-utils/utils";
import Room from "../model/Room";
import { User } from "../types";

const disconnecting = (socket, io) => {
  socket.on('disconnecting', async () => {
    try {
      const pUser: User | undefined = await leaveRoom(socket.id);
      await Room.updateOne(
        { _id: pUser.room },
        {
          $pull: {
            users: { id: socket.id },
            gameUsers: { id: socket.id },
          }
        }
      );
      if (pUser) {
        await socket.leave(pUser.room);
      }
      const theRoom = await Room.findById(pUser.room);
      const rooms = await Room.find();
      socket.to(pUser.room).emit('playerLeft', socket.id);
      io.in(pUser.room).emit('updatedRoom', theRoom);
      io.emit('updatedRooms', rooms);
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export default disconnecting;
