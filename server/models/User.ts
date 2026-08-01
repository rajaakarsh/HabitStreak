/**
 * User.ts — Mongoose user model with full TypeScript typing.
 * Supports both local (email/password) and Google OAuth accounts.
 */

import mongoose, { Schema } from 'mongoose';
import type { Model, Document, CallbackError } from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Interfaces ────────────────────────────────────────────────

export type AuthProvider = 'local' | 'google';

export interface IUser {
  email:        string;
  passwordHash: string | null;
  name:         string;
  photoURL:     string;
  provider:     AuthProvider;
  googleId:     string | null;
  createdAt:    Date;
  lastLogin:    Date | null;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDocument = Document<unknown, object, IUser> & IUser & IUserMethods;
export type UserModel    = Model<IUser, object, IUserMethods>;

// ── Schema ────────────────────────────────────────────────────

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  email: {
    type:     String,
    required: [true, 'Email is required'],
    unique:   true,
    lowercase: true,
    trim:     true,
    match:    [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  passwordHash: {
    type:    String,
    default: null,
  },
  name: {
    type:    String,
    default: '',
    trim:    true,
  },
  photoURL: {
    type:    String,
    default: '',
  },
  provider: {
    type:    String,
    enum:    ['local', 'google'] as AuthProvider[],
    default: 'local' as AuthProvider,
  },
  googleId: {
    type:    String,
    default: null,
    index:   true,
    sparse:  true,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
  lastLogin: {
    type:    Date,
    default: null,
  },
});

// ── Pre-save hook: hash password ──────────────────────────────

userSchema.pre('save', async function (next: (err?: CallbackError) => void) {
  if (!this.passwordHash || !this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt       = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err as CallbackError);
  }
});

// ── Instance method: compare password ────────────────────────

userSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidate: string,
): Promise<boolean> {
  if (!this.passwordHash) { return false; }
  return bcrypt.compare(candidate, this.passwordHash);
};

// ── Model export ──────────────────────────────────────────────

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
