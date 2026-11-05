
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },

  companyName: {
    type: String,
    trim: true,
    default: ''
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['candidate', 'company', 'admin'],
    default: 'candidate'
  },

  refreshToken: {
    type: String
  },

  resetToken: String,

  resetTokenExpire: Date

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
