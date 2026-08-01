require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);

// Fallback: serve index.html for any non-API route (SPA-style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.', details: err.message });
});

// ---------------------------------------------------------------------------
// Connect to MongoDB & Start Server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

async function startServer() {
  let mongoUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.log(`⚠️  Could not connect to ${mongoUri} — ${err.message}`);
    console.log('🔄 Starting in-memory MongoDB (data will reset on restart)...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 HabitStreak server running on http://localhost:${PORT}`);
  });
}

// Serverless / Vercel Database Connection Middleware
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: 'Server configuration error: MONGODB_URI is not set in Vercel.' });
    }
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to connect to MongoDB.', details: err.message });
      }
    }
    next();
  });
} else {
  // Only start the long-running listener if not on Vercel
  startServer();
}

// Export for Vercel serverless function
module.exports = app;
