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
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;