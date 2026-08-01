const Habit = require('../models/Habit');
const CheckIn = require('../models/CheckIn');

/**
 * Compute current streak and longest streak from an array of date strings.
 * Dates should be in YYYY-MM-DD format.
 */
function computeStreaks(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates ascending
  const sorted = [...dateStrings].sort();

  // Convert to Date objects for day-diff calculation
  const toDate = (s) => new Date(s + 'T00:00:00Z');

  // Build an array of day differences
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = toDate(sorted[i - 1]);
    const curr = toDate(sorted[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
    } else if (diffDays > 1) {
      currentRun = 1;
    }
    // diffDays === 0 means duplicate date, ignore

    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  // Current streak: walk backwards from today
  const today = new Date();
  const todayStr =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0');

  const dateSet = new Set(sorted);
  let currentStreak = 0;
  let checkDate = new Date(today);

  while (true) {
    const checkStr =
      checkDate.getFullYear() +
      '-' +
      String(checkDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(checkDate.getDate()).padStart(2, '0');

    if (dateSet.has(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * GET /api/habits
 * List all active habits for the authenticated user, with today's check-in status and streaks.
 */
async function getHabits(req, res) {
  try {
    const habits = await Habit.find({ userId: req.user.id, active: true }).sort({ createdAt: -1 });

    const today = new Date();
    const todayStr =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    // Fetch all check-ins for all habits in one query
    const habitIds = habits.map((h) => h._id);
    const allCheckIns = await CheckIn.find({ habitId: { $in: habitIds } }).select('habitId date');

    // Group check-ins by habitId
    const checkInMap = {};
    for (const ci of allCheckIns) {
      const key = ci.habitId.toString();
      if (!checkInMap[key]) checkInMap[key] = [];
      checkInMap[key].push(ci.date);
    }

    const result = habits.map((habit) => {
      const dates = checkInMap[habit._id.toString()] || [];
      const { currentStreak, longestStreak } = computeStreaks(dates);
      const checkedInToday = dates.includes(todayStr);

      return {
        _id: habit._id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        active: habit.active,
        createdAt: habit.createdAt,
        currentStreak,
        longestStreak,
        checkedInToday,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('getHabits error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/habits
 * Create a new habit.
 */
async function createHabit(req, res) {
  try {
    const { name, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Habit name is required.' });
    }

    const habit = new Habit({
      userId: req.user.id,
      name: name.trim(),
      color: color || '#10b981',
      icon: icon || '✦',
    });

    await habit.save();
    res.status(201).json(habit);
  } catch (err) {
    console.error('createHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PUT /api/habits/:id
 * Update habit name, color, or icon.
 */
async function updateHabit(req, res) {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const { name, color, icon } = req.body;
    if (name !== undefined) habit.name = name.trim();
    if (color !== undefined) habit.color = color;
    if (icon !== undefined) habit.icon = icon;

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error('updateHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * DELETE /api/habits/:id
 * Soft-delete a habit (set active = false) to preserve check-in history.
 */
async function deleteHabit(req, res) {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    habit.active = false;
    await habit.save();

    res.json({ message: 'Habit deleted.' });
  } catch (err) {
    console.error('deleteHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/habits/:id
 * Single habit detail with full check-in history and streaks.
 */
async function getHabitDetail(req, res) {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const checkIns = await CheckIn.find({ habitId: habit._id }).select('date').sort({ date: 1 });
    const dates = checkIns.map((ci) => ci.date);
    const { currentStreak, longestStreak } = computeStreaks(dates);

    const today = new Date();
    const todayStr =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    res.json({
      _id: habit._id,
      name: habit.name,
      color: habit.color,
      icon: habit.icon,
      active: habit.active,
      createdAt: habit.createdAt,
      currentStreak,
      longestStreak,
      checkedInToday: dates.includes(todayStr),
      checkInDates: dates,
    });
  } catch (err) {
    console.error('getHabitDetail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getHabits, createHabit, updateHabit, deleteHabit, getHabitDetail };
