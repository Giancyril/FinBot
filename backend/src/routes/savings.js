const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/savings
// Fetch all savings goals for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching savings goals:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/savings
// Create a new savings goal
router.post('/', authMiddleware, async (req, res) => {
  const { name, target_amount, current_amount, target_date } = req.body;
  if (!name || target_amount == null || target_amount <= 0) {
    return res.status(400).json({ error: 'Goal name and a positive target amount are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        req.user.id,
        name,
        target_amount,
        current_amount || 0,
        target_date || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating savings goal:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/savings/:id
// Update an existing savings goal (can be used to contribute funds or edit properties)
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, target_amount, current_amount, target_date } = req.body;

  if (target_amount != null && target_amount <= 0) {
    return res.status(400).json({ error: 'Target amount must be greater than zero' });
  }

  try {
    // Build query dynamically based on provided fields
    const fields = [];
    const values = [];
    let queryIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${queryIndex++}`);
      values.push(name);
    }
    if (target_amount !== undefined) {
      fields.push(`target_amount = $${queryIndex++}`);
      values.push(target_amount);
    }
    if (current_amount !== undefined) {
      fields.push(`current_amount = $${queryIndex++}`);
      values.push(current_amount);
    }
    if (target_date !== undefined) {
      fields.push(`target_date = $${queryIndex++}`);
      values.push(target_date || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update provided' });
    }

    // Add metadata fields
    fields.push(`updated_at = NOW()`);

    // Add user_id and goal_id to values
    const goalIdIndex = queryIndex++;
    const userIdIndex = queryIndex++;
    values.push(req.params.id);
    values.push(req.user.id);

    const query = `
      UPDATE savings_goals
      SET ${fields.join(', ')}
      WHERE id = $${goalIdIndex} AND user_id = $${userIdIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating savings goal:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/savings/:id
// Delete a savings goal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    res.json({ message: 'Savings goal deleted successfully', goal: result.rows[0] });
  } catch (err) {
    console.error('Error deleting savings goal:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
