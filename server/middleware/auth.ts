/**
 * auth.ts — JWT access-token verification middleware.
 * Attaches req.user = { id } on success.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ── Express Request augmentation ──────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

// ── JWT payload shape ─────────────────────────────────────────

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

// ── Middleware ────────────────────────────────────────────────

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'Server configuration error: JWT_SECRET not set.' });
    return;
  }

  try {
    const decoded  = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user       = { id: decoded.id };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
}
