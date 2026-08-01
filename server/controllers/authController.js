const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate access + refresh token pair for a user.
 */
function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Create user (password hashing happens in pre-save hook)
    const user = new User({ email, passwordHash: password });
    await user.save();

    const tokens = generateTokens(user._id);

    res.status(201).json({
      message: 'Account created successfully.',
      ...tokens,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const tokens = generateTokens(user._id);

    res.json({
      message: 'Logged in successfully.',
      ...tokens,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Issue a new access token (but not a new refresh token)
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
}

module.exports = { signup, login, refresh };
