import handleError from "../utils/error"

export const chat = (socket, io) => {
  socket.on('chat', async ({ username, message, date, room, sprite }) => {
    try {
      io.in(room).emit('chat_msg', { username, message, date, sprite });
    } catch (err) {
      handleError(socket, err.message);
    }
  });
};