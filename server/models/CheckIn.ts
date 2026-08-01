/**
 * CheckIn.ts — Mongoose check-in model.
 * One check-in per habit per day (enforced via unique compound index).
 */

import mongoose, { Schema } from 'mongoose';
import type { Model, Document, Types } from 'mongoose';

// ── Interfaces ────────────────────────────────────────────────

export interface ICheckIn {
  habitId:   Types.ObjectId;
  userId:    Types.ObjectId;
  /** YYYY-MM-DD format */
  date:      string;
  createdAt: Date;
}

export type CheckInDocument = Document<unknown, object, ICheckIn> & ICheckIn;
export type CheckInModel    = Model<ICheckIn>;

// ── Schema ────────────────────────────────────────────────────

const checkinSchema = new Schema<ICheckIn, CheckInModel>({
  habitId: {
    type:     Schema.Types.ObjectId,
    ref:      'Habit',
    required: true,
  },
  userId: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  date: {
    type:     String,
    required: true,
    match:    [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

// Unique index: one check-in per habit per day
checkinSchema.index({ habitId: 1, date: 1 }, { unique: true });
// Fast lookups by user
checkinSchema.index({ userId: 1 });

export const CheckIn = mongoose.model<ICheckIn, CheckInModel>('CheckIn', checkinSchema);
