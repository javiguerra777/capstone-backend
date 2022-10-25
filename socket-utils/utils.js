const users = []

// joins the user to the specific post
function joinRoom(id, username, room) {
  const pUser = { id, username, room };
  users.push(pUser);
  return pUser;
}
// get a particular user id to return the current user
function getCurrentUser(id) {
  return users.find((pUser) => pUser.id === id);
}
// called when the user leaves the post and its user object is deleted from the array
function leaveRoom(id) {
  const index = users.findIndex((pUser) => pUser.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

module.exports = {
  joinRoom,
  getCurrentUser,
  leaveRoom,
};