/**
 * authController.ts — Email/password signup, login, and token refresh.
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// ── Types ─────────────────────────────────────────────────────

interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

interface LoginBody {
  email:    string;
  password: string;
}

interface SignupBody {
  email:    string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface JwtPayload {
  id: string;
}

// ── Helpers ───────────────────────────────────────────────────

function generateTokens(userId: string): TokenPair {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured on the server (missing JWT_SECRET or JWT_REFRESH_SECRET).');
  }
  const accessToken  = jwt.sign({ id: userId }, process.env.JWT_SECRET,         { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// ── POST /api/auth/signup ─────────────────────────────────────

export async function signup(req: Request<object, object, SignupBody>, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const user = new User({
      email,
      passwordHash: password,
      provider:     'local',
      name:         email.split('@')[0],
    });
    await user.save();

    const tokens = generateTokens(String(user._id));

    res.status(201).json({
      message: 'Account created successfully.',
      ...tokens,
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        photoURL: user.photoURL || '',
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.', details: (err as Error).message });
  }
}

// ── POST /api/auth/login ──────────────────────────────────────

export async function login(req: Request<object, object, LoginBody>, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.provider === 'google' && !user.passwordHash) {
      res.status(401).json({ error: 'This account uses Google Sign-In. Please continue with Google.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const tokens = generateTokens(String(user._id));

    res.json({
      message: 'Logged in successfully.',
      ...tokens,
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        photoURL: user.photoURL || '',
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.', details: (err as Error).message });
  }
}

// ── POST /api/auth/refresh ────────────────────────────────────

export function refresh(req: Request<object, object, RefreshBody>, res: Response): void {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required.' });
      return;
    }

    if (!process.env.JWT_REFRESH_SECRET || !process.env.JWT_SECRET) {
      res.status(500).json({ error: 'Server configuration error.' });
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as JwtPayload;

    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
}
