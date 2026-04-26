const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({

  users: [{ type: String, required: true }], // Guardamos los usernames 
  status: { type: String, default: 'accepted' },
  since: { type: Date, default: Date.now },
  last_interaction: { type: Date, default: Date.now }

});

// Indexamos 'users' para que las búsquedas sean instantáneas
friendshipSchema.index({ users: 1 });

module.exports = mongoose.models.friendships || mongoose.model('friendships', friendshipSchema, 'friendships');