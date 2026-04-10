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
  friendCode: {
    type: String,
    unique: true,
  },
  birthDate: {
    type: Date,
    required: false
  },
  language: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: false,
    unique: true,
    trim: true
  },
  iconName: {
    type: String,
    required: false,
    default: 'SinAvatar.png'
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  totalScore: {
    type: Number,
    default: 0
  }

});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;
