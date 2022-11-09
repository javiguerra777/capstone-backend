import handleError from "../utils/error";
import { joinRoom } from "../socket-utils/utils";
import Room from "../model/Room";

const joinGame = (socket, io) => {
socket.on('join_room', async ({ room, username, sprite }) => {
    try {
      const startingCoords = {
        x: 400,
        y: 400,
      };
      const secondaryCoords = {
        x: 1400,
        y: 400,
      };
      const thirdCoords = {
        x: 1500,
        y: 1500,
      }
      const fourthCoords = {
        x: 300,
        y: 1500
      }
      const fifthCoords = {
        x: 1300,
        y: 1000,
      }
      const sixthCoords = {
        x: 1000,
        y: 1250,
      }
      await joinRoom(socket.id, username, room);
      await Room.updateOne(
        { _id: room },
        {
          $push: {
            users: { id: socket.id, username, direction: 'down', x: 500, y: 500, sprite },
          }
        },
      );
      const rooms = await Room.find();
      const theRoom = await Room.findById(room);
      let userCoords;
      if (theRoom?.gameUsers.length === 0) {
        userCoords = startingCoords;
      }
      theRoom?.gameUsers.forEach((theUser) => {
        if (theUser.startingCoords && theUser.startingCoords.x === startingCoords.x && theUser.startingCoords.y === startingCoords.y) {
          userCoords = secondaryCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === secondaryCoords.x && theUser.startingCoords.y === secondaryCoords.y) {
          userCoords = thirdCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === thirdCoords.x && theUser.startingCoords.y === thirdCoords.y) {
          userCoords = fourthCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === fourthCoords.x && theUser.startingCoords.y === fourthCoords.y) {
          userCoords = fifthCoords;
          return;
        } else if (theUser.startingCoords && theUser.startingCoords.x === thirdCoords.x && theUser.startingCoords.y === thirdCoords.y) {
          userCoords = sixthCoords;
          return;
        } else {
          userCoords = startingCoords;
          return;
        }
      });
      await Room.updateOne(
          { _id: room },
          {
            $push: {
            gameUsers: {id: socket.id, username, direction: 'down', sprite, startingCoords: {x: userCoords.x, y: userCoords.y}}
            }
          }
        )
      await socket.emit('update_coords', userCoords)
      await socket.join(room);
      io.in(room).emit('updatedRoom', theRoom);
      io.emit('updatedRooms', rooms);
    } catch (err) {
      handleError(socket, err.message);
    }
  });
}

export default joinGame;
