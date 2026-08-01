const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent double-logging: one check-in per habit per day
checkinSchema.index({ habitId: 1, date: 1 }, { unique: true });

// Fast lookups by user
checkinSchema.index({ userId: 1 });

module.exports = mongoose.model('CheckIn', checkinSchema);
