const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

const SALT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Check for existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(201).json({
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.json({
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me — verify current session
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/auth/update
// Update user email or password
router.put('/update', require('../middleware/auth'), async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  try {
    const userResult = await pool.query('SELECT id, email, password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    // If changing password or email, we require currentPassword validation
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to make changes.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const updates = [];
    const values = [];
    let queryIndex = 1;

    if (email && email.toLowerCase() !== user.email) {
      const emailLower = email.toLowerCase();
      // Check if email is already taken
      const takenResult = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
      if (takenResult.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      updates.push(`email = $${queryIndex++}`);
      values.push(emailLower);
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      }
      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      updates.push(`password_hash = $${queryIndex++}`);
      values.push(newHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No new values provided for update.' });
    }

    values.push(req.user.id);
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${queryIndex}
      RETURNING id, email, created_at
    `;

    const updateResult = await pool.query(query, values);
    const updatedUser = updateResult.rows[0];

    // Re-issue JWT token with new email if changed
    const token = jwt.sign(
      { userId: updatedUser.id, email: updatedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({
      message: 'Account updated successfully.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.status(500).json({ error: 'Server error during profile update.' });
  }
});

module.exports = router;
