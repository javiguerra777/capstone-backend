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
  host: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('Room', roomSchema);