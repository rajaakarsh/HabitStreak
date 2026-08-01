/**
 * habits.ts — Habit and check-in routes (all protected by JWT).
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitDetail,
} from '../controllers/habitController';
import {
  checkIn,
  uncheckIn,
  getCheckIns,
} from '../controllers/checkinController';

const router = Router();

// All routes are protected
router.use(verifyToken);

// Habit CRUD
router.get('/',    (req, res) => { void getHabits(req, res);      });
router.post('/',   (req, res) => { void createHabit(req, res);    });
router.get('/:id', (req, res) => { void getHabitDetail(req, res); });
router.put('/:id', (req, res) => { void updateHabit(req, res);    });
router.delete('/:id', (req, res) => { void deleteHabit(req, res); });

// Check-in routes
router.post('/:habitId/checkin',   (req, res) => { void checkIn(req, res);    });
router.delete('/:habitId/checkin', (req, res) => { void uncheckIn(req, res);  });
router.get('/:habitId/checkins',   (req, res) => { void getCheckIns(req, res); });

export default router;
