const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitDetail,
} = require('../controllers/habitController');
const {
  checkIn,
  uncheckIn,
  getCheckIns,
} = require('../controllers/checkinController');

// All routes are protected
router.use(verifyToken);

// Habit CRUD
router.get('/', getHabits);
router.post('/', createHabit);
router.get('/:id', getHabitDetail);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);

// Check-in routes (nested under habits)
router.post('/:habitId/checkin', checkIn);
router.delete('/:habitId/checkin', uncheckIn);
router.get('/:habitId/checkins', getCheckIns);

module.exports = router;
