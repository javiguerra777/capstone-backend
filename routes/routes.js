const express = require('express');
const Room = require('../model/Room');

const router = express.Router();
// rest api functionality
router.route('/').get(async (req, res) => {
  try {
    res.status(200).json('Welcome to the videogame server');
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.route('/room/:id').get(async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Room.findById(id);
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.route('/room/:id').put(async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Room.updateOne(
      { _id: id },
      {
        $push: {
          score: { username: req.body.username, score: req.body.score }
        }
      }
    );
    return res.status(200).json(data);
  } catch (err) {
    return res.status(400).json(err.message);
  }
});
router.route('/rooms').get(async (req, res) => {
  try {
    const data = await Room.find();
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.route('/createRoom').post(async (req, res) => {
  try {
    const data = new Room({
      name: req.body.name,
      host: req.body.username,
      maxUsers: req.body.maxPlayers
    });
    const roomToSave = await data.save();
    res.status(200).json(roomToSave);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
module.exports = router;
