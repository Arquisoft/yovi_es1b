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
  score: { 
    type: Number, 
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);