/**
 * habitController.ts — Habit CRUD and streak computation.
 */

import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { Habit } from '../models/Habit';
import { CheckIn } from '../models/CheckIn';

// ── Types ─────────────────────────────────────────────────────

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

interface HabitListItem {
  _id:            Types.ObjectId;
  name:           string;
  color:          string;
  icon:           string;
  active:         boolean;
  createdAt:      Date;
  currentStreak:  number;
  longestStreak:  number;
  checkedInToday: boolean;
}

interface CreateHabitBody {
  name:  string;
  color?: string;
  icon?:  string;
}

interface UpdateHabitBody {
  name?:  string;
  color?: string;
  icon?:  string;
}

// ── Helpers ───────────────────────────────────────────────────

function getTodayStr(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  );
}

function computeStreaks(dateStrings: string[]): StreakResult {
  if (!dateStrings || dateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sorted = [...dateStrings].sort();
  const toDate = (s: string): Date => new Date(s + 'T00:00:00Z');

  let longestStreak = 1;
  let currentRun    = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevStr = sorted[i - 1];
    const currStr = sorted[i];
    if (!prevStr || !currStr) { continue; }

    const prev     = toDate(prevStr);
    const curr     = toDate(currStr);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
    } else if (diffDays > 1) {
      currentRun = 1;
    }

    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  const dateSet  = new Set<string>(sorted);
  let currentStreak = 0;
  const checkDate   = new Date();
  let checking = true;

  while (checking) {
    const checkStr = (
      checkDate.getFullYear() +
      '-' +
      String(checkDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(checkDate.getDate()).padStart(2, '0')
    );

    if (dateSet.has(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checking = false;
    }
  }

  return { currentStreak, longestStreak };
}

// ── GET /api/habits ───────────────────────────────────────────

export async function getHabits(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const habits = await Habit.find({ userId, active: true }).sort({ createdAt: -1 });

    const todayStr  = getTodayStr();
    const habitIds  = habits.map((h) => h._id);
    const allCheckIns = await CheckIn.find({ habitId: { $in: habitIds } }).select('habitId date');

    const checkInMap = new Map<string, string[]>();
    for (const ci of allCheckIns) {
      const key = ci.habitId.toString();
      const arr = checkInMap.get(key) ?? [];
      arr.push(ci.date);
      checkInMap.set(key, arr);
    }

    const result: HabitListItem[] = habits.map((habit) => {
      const dates            = checkInMap.get(habit._id.toString()) ?? [];
      const { currentStreak, longestStreak } = computeStreaks(dates);
      return {
        _id:            habit._id,
        name:           habit.name,
        color:          habit.color,
        icon:           habit.icon,
        active:         habit.active,
        createdAt:      habit.createdAt,
        currentStreak,
        longestStreak,
        checkedInToday: dates.includes(todayStr),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('getHabits error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── POST /api/habits ──────────────────────────────────────────

export async function createHabit(req: Request<object, object, CreateHabitBody>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const { name, color, icon } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Habit name is required.' });
      return;
    }

    const habit = new Habit({
      userId,
      name:   name.trim(),
      color:  color ?? '#10b981',
      icon:   icon  ?? '✦',
    });

    await habit.save();
    res.status(201).json(habit);
  } catch (err) {
    console.error('createHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── PUT /api/habits/:id ───────────────────────────────────────

export async function updateHabit(req: Request<{ id: string }, object, UpdateHabitBody>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const habit = await Habit.findOne({ _id: req.params.id, userId });

    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    const { name, color, icon } = req.body;
    if (name  !== undefined) { habit.name  = name.trim(); }
    if (color !== undefined) { habit.color = color; }
    if (icon  !== undefined) { habit.icon  = icon; }

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error('updateHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── DELETE /api/habits/:id ────────────────────────────────────

export async function deleteHabit(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const habit = await Habit.findOne({ _id: req.params.id, userId });

    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    habit.active = false;
    await habit.save();
    res.json({ message: 'Habit deleted.' });
  } catch (err) {
    console.error('deleteHabit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── GET /api/habits/:id ───────────────────────────────────────

export async function getHabitDetail(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const habit = await Habit.findOne({ _id: req.params.id, userId });

    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    const checkIns = await CheckIn.find({ habitId: habit._id }).select('date').sort({ date: 1 });
    const dates    = checkIns.map((ci) => ci.date);
    const { currentStreak, longestStreak } = computeStreaks(dates);

    const todayStr = getTodayStr();

    res.json({
      _id:            habit._id,
      name:           habit.name,
      color:          habit.color,
      icon:           habit.icon,
      active:         habit.active,
      createdAt:      habit.createdAt,
      currentStreak,
      longestStreak,
      checkedInToday: dates.includes(todayStr),
      checkInDates:   dates,
    });
  } catch (err) {
    console.error('getHabitDetail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
