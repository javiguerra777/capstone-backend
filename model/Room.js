const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxLength: 15,
  },
  users: {
    type: Array,
  },
  gameUsers: {
    type: Array,
  },
  score: {
    type: Array,
  },
  maxUsers: {
    type: Number,
    required: true,
  },
  host: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('Room', roomSchema);