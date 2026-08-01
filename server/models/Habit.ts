/**
 * Habit.ts — Mongoose habit model.
 */

import mongoose, { Schema } from 'mongoose';
import type { Model, Document, Types } from 'mongoose';

// ── Interfaces ────────────────────────────────────────────────

export interface IHabit {
  userId:    Types.ObjectId;
  name:      string;
  color:     string;
  icon:      string;
  active:    boolean;
  createdAt: Date;
}

export type HabitDocument = Document<unknown, object, IHabit> & IHabit;
export type HabitModel    = Model<IHabit>;

// ── Schema ────────────────────────────────────────────────────

const habitSchema = new Schema<IHabit, HabitModel>({
  userId: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  name: {
    type:      String,
    required:  [true, 'Habit name is required'],
    trim:      true,
    maxlength: [100, 'Habit name cannot exceed 100 characters'],
  },
  color: {
    type:    String,
    default: '#10b981',
    match:   [/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'],
  },
  icon: {
    type:    String,
    default: '✦',
  },
  active: {
    type:    Boolean,
    default: true,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

export const Habit = mongoose.model<IHabit, HabitModel>('Habit', habitSchema);
