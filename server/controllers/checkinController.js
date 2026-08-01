const CheckIn = require('../models/CheckIn');
const Habit = require('../models/Habit');

/**
 * Get today's date string in YYYY-MM-DD format.
 */
function getTodayStr() {
  const today = new Date();
  return (
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  );
}

/**
 * POST /api/habits/:habitId/checkin
 * Log a check-in for today. The unique index prevents duplicates.
 */
async function checkIn(req, res) {
  try {
    const { habitId } = req.params;

    // Verify the habit belongs to this user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id, active: true });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const todayStr = getTodayStr();

    const entry = new CheckIn({
      habitId,
      userId: req.user.id,
      date: todayStr,
    });

    await entry.save();
    res.status(201).json({ message: 'Checked in!', date: todayStr });
  } catch (err) {
    // Duplicate key error (already checked in today)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already checked in today.' });
    }
    console.error('checkIn error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * DELETE /api/habits/:habitId/checkin
 * Remove today's check-in (undo).
 */
async function uncheckIn(req, res) {
  try {
    const { habitId } = req.params;

    // Verify the habit belongs to this user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const todayStr = getTodayStr();

    const result = await CheckIn.findOneAndDelete({
      habitId,
      userId: req.user.id,
      date: todayStr,
    });

    if (!result) {
      return res.status(404).json({ error: 'No check-in found for today.' });
    }

    res.json({ message: 'Check-in removed.', date: todayStr });
  } catch (err) {
    console.error('uncheckIn error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/habits/:habitId/checkins
 * Return all check-in dates for a habit (used by detail view).
 */
async function getCheckIns(req, res) {
  try {
    const { habitId } = req.params;

    // Verify the habit belongs to this user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const checkIns = await CheckIn.find({ habitId }).select('date').sort({ date: 1 });
    const dates = checkIns.map((ci) => ci.date);

    res.json({ dates });
  } catch (err) {
    console.error('getCheckIns error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { checkIn, uncheckIn, getCheckIns };
