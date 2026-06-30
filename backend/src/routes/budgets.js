const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/budgets
// Fetch all budgets for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1 ORDER BY category ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/budgets
// Create or update a budget limit for a category
router.post('/', authMiddleware, async (req, res) => {
  const { category, limit_amount } = req.body;
  if (!category || limit_amount == null || limit_amount < 0) {
    return res.status(400).json({ error: 'Category and positive limit_amount are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, limit_amount, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, category)
       DO UPDATE SET limit_amount = EXCLUDED.limit_amount, updated_at = NOW()
       RETURNING *`,
      [req.user.id, category, limit_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error setting budget:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/budgets/:id
// Delete a budget limit
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully', budget: result.rows[0] });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
