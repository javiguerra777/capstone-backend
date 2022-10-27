const handleError = (socket, err) => {
  socket.emit('server_err', err.message);
}

export default handleError;
