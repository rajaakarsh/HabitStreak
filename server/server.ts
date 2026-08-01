/**
 * server.ts — Express app with MongoDB connection.
 * Exported for Vercel serverless and used directly for local development.
 */

import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes  from './routes/auth';
import habitRoutes from './routes/habits';

// ── App setup ─────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve frontend (Vite-built dist/ in production)
// __dirname is available in CommonJS output (tsc compiles to CJS)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ── API routes ────────────────────────────────────────────────

app.use('/api/auth',   authRoutes);
app.use('/api/habits', habitRoutes);

// Fallback: serve index.html for non-API routes (SPA)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.', details: err.message });
});

// ── Database connection + server start ────────────────────────

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  let mongoUri = process.env.MONGODB_URI;

  try {
    if (!mongoUri) { throw new Error('MONGODB_URI is not set'); }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.log(`⚠️  Could not connect to MongoDB — ${(err as Error).message}`);
    console.log('🔄 Starting in-memory MongoDB...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server') as { MongoMemoryServer: { create: () => Promise<{ getUri: () => string }> } };
      const mongod = await MongoMemoryServer.create();
      mongoUri     = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', (memErr as Error).message);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 HabitStreak server running on http://localhost:${PORT}`);
  });
}

// Vercel serverless: inject DB middleware instead of starting a persistent listener
if (process.env.VERCEL) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      if (!process.env.MONGODB_URI) {
        res.status(500).json({ error: 'Server configuration error: MONGODB_URI is not set.' });
        return;
      }
      if (Number(mongoose.connection.readyState) !== 1) {
        try {
          await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
        } catch (err) {
          res.status(500).json({ error: 'Failed to connect to MongoDB.', details: (err as Error).message });
          return;
        }
      }
      next();
    })();
  });
} else {
  void startServer();
}

export default app;
