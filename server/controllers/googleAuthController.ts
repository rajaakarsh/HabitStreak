/**
 * googleAuthController.ts — Google OAuth token verification and user upsert.
 */

import type { Request, Response } from 'express';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// ── Types ─────────────────────────────────────────────────────

interface GoogleAuthBody {
  idToken: string;
}

interface GeneratedTokens {
  accessToken:  string;
  refreshToken: string;
}

// ── OAuth2 client (lazy init) ─────────────────────────────────

let _client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!_client) {
    _client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return _client;
}

// ── Helpers ───────────────────────────────────────────────────

function generateTokens(userId: string): GeneratedTokens {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured on the server.');
  }
  const accessToken  = jwt.sign({ id: userId }, process.env.JWT_SECRET,         { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d'  });
  return { accessToken, refreshToken };
}

// ── POST /api/auth/google ─────────────────────────────────────

export async function googleAuth(
  req: Request<object, object, GoogleAuthBody>,
  res: Response,
): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required.' });
      return;
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: 'Google authentication is not configured on this server.' });
      return;
    }

    // Verify the Google ID token
    let payload: TokenPayload | undefined;
    try {
      const ticket = await getClient().verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google token verification failed:', (verifyErr as Error).message);
      res.status(401).json({ error: 'Invalid Google token. Please try again.' });
      return;
    }

    if (!payload) {
      res.status(401).json({ error: 'Google token payload is empty.' });
      return;
    }

    const { sub: googleId, email, name, picture: photoURL } = payload;

    if (!email || !googleId) {
      res.status(400).json({ error: 'Google account does not have an email address.' });
      return;
    }

    // Upsert: find by googleId first, then by email
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link Google to existing local account
        user.googleId  = googleId;
        user.provider  = 'google';
        if (!user.name)     { user.name     = name     ?? ''; }
        if (!user.photoURL) { user.photoURL = photoURL ?? ''; }
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
      } else {
        // Brand new user
        user = new User({
          email:        email.toLowerCase(),
          name:         name     ?? '',
          photoURL:     photoURL ?? '',
          googleId,
          provider:     'google',
          passwordHash: null,
          lastLogin:    new Date(),
        });
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Returning Google user — refresh profile
      user.name      = name     ?? user.name;
      user.photoURL  = photoURL ?? user.photoURL;
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    }

    const tokens = generateTokens(String(user._id));

    res.json({
      message: 'Authenticated with Google.',
      ...tokens,
      user: {
        id:       user._id,
        email:    user.email,
        name:     user.name,
        photoURL: user.photoURL,
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error('googleAuth error:', err);
    res.status(500).json({ error: 'Internal server error.', details: (err as Error).message });
  }
}
