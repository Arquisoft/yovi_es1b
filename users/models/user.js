const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  age: {
    type: Number,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  gameHistory: [{
    date: { 
      type: Date, 
      default: Date.now 
    },
    result: { 
      type: String, 
      enum: ['Win', 'Loss', 'Draw'] 
    },
    opponent: String,
    difficulty: String
  }]
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;