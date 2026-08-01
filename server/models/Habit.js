const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters'],
  },
  color: {
    type: String,
    default: '#10b981', // emerald
    match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'],
  },
  icon: {
    type: String,
    default: '✦',
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Habit', habitSchema);
