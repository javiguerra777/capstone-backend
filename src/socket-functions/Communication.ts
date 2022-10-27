import handleError from "../utils/error"

export const chat = (socket, io) => {
  socket.on('chat', async ({ username, message, date, room }) => {
    try {
      io.in(room).emit('chat_msg', { username, message, date });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};