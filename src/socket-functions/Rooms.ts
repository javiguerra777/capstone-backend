import Room from '../model/Room';
import handleError from '../utils/error';

export const updateRooms = (socket, io) => {
  socket.on('updateRooms', async () => {
    try {
      console.log('updating rooms');
      const data = await Room.find();
      io.emit('updatedRooms', data);
    } catch (err) {
      handleError(socket, err.message);
    }
  })
};

export const returnToLobby = (socket, io) => {
  socket.on('return_to_lobby', async ({ room }) => {
    try {
      io.in(room).emit('lobby');
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};

export default {};
