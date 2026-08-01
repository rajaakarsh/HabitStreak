/**
 * checkinController.ts — Check-in and undo check-in for a habit.
 */

import type { Request, Response } from 'express';
import { CheckIn } from '../models/CheckIn';
import { Habit } from '../models/Habit';

// ── Types ─────────────────────────────────────────────────────

interface HabitIdParams {
  habitId: string;
}

interface MongoError extends Error {
  code?: number;
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

// ── POST /api/habits/:habitId/checkin ─────────────────────────

export async function checkIn(req: Request<HabitIdParams>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId, active: true });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    const todayStr = getTodayStr();
    const entry    = new CheckIn({ habitId, userId, date: todayStr });

    await entry.save();
    res.status(201).json({ message: 'Checked in!', date: todayStr });
  } catch (err) {
    if ((err as MongoError).code === 11000) {
      res.status(409).json({ error: 'Already checked in today.' });
      return;
    }
    console.error('checkIn error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── DELETE /api/habits/:habitId/checkin ───────────────────────

export async function uncheckIn(req: Request<HabitIdParams>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    const todayStr = getTodayStr();
    const result   = await CheckIn.findOneAndDelete({ habitId, userId, date: todayStr });

    if (!result) {
      res.status(404).json({ error: 'No check-in found for today.' });
      return;
    }

    res.json({ message: 'Check-in removed.', date: todayStr });
  } catch (err) {
    console.error('uncheckIn error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ── GET /api/habits/:habitId/checkins ─────────────────────────

export async function getCheckIns(req: Request<HabitIdParams>, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const userId = req.user.id;
    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found.' });
      return;
    }

    const checkIns = await CheckIn.find({ habitId }).select('date').sort({ date: 1 });
    const dates    = checkIns.map((ci) => ci.date);

    res.json({ dates });
  } catch (err) {
    console.error('getCheckIns error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
