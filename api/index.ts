/**
 * api/index.ts — Vercel serverless function entry point.
 * Re-exports the Express app so Vercel can invoke it as a serverless handler.
 */

import app from '../server/server';

export default app;
