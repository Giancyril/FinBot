const express = require('express');
const pool = require('../config/db');
const plaidClient = require('../config/plaidClient');
const { decrypt } = require('../services/cryptoService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Internal helper: sync transactions for a single plaid_item.
 * Uses transactionsSync with cursor-based pagination to get all changes.
 */
async function syncItemTransactions(item) {
  const accessToken = decrypt(item.access_token_encrypted);
  let cursor = item.cursor || null;
  let hasMore = true;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || undefined,
      count: 500,
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    // Upsert added and modified transactions
    const toUpsert = [...added, ...modified];
    for (const txn of toUpsert) {
      await pool.query(
        `INSERT INTO transactions
           (user_id, plaid_transaction_id, amount, category, subcategory, merchant_name, name, date, pending)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (plaid_transaction_id) DO UPDATE SET
           amount = EXCLUDED.amount,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           merchant_name = EXCLUDED.merchant_name,
           name = EXCLUDED.name,
           date = EXCLUDED.date,
           pending = EXCLUDED.pending,
           updated_at = NOW()`,
        [
          item.user_id,
          txn.transaction_id,
          txn.amount,
          txn.personal_finance_category?.primary || (txn.category?.[0] ?? 'Other'),
          txn.personal_finance_category?.detailed || (txn.category?.[1] ?? null),
          txn.merchant_name || null,
          txn.name,
          txn.date,
          txn.pending,
        ]
      );
    }

    addedCount += added.length;
    modifiedCount += modified.length;

    // Remove deleted transactions
    for (const removed_txn of removed) {
      await pool.query('DELETE FROM transactions WHERE plaid_transaction_id = $1', [removed_txn.transaction_id]);
      removedCount++;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  // Save the new cursor
  await pool.query(
    'UPDATE plaid_items SET cursor = $1, last_synced_at = NOW() WHERE id = $2',
    [cursor, item.id]
  );

  return { added: addedCount, modified: modifiedCount, removed: removedCount };
}

// POST /api/transactions/sync
// Trigger a manual transaction sync for the current user
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const itemsResult = await pool.query(
      'SELECT id, user_id, access_token_encrypted, cursor FROM plaid_items WHERE user_id = $1',
      [req.user.id]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No connected bank accounts found. Please connect a bank first.' });
    }

    let totalAdded = 0, totalModified = 0, totalRemoved = 0;
    for (const item of itemsResult.rows) {
      const counts = await syncItemTransactions(item);
      totalAdded += counts.added;
      totalModified += counts.modified;
      totalRemoved += counts.removed;
    }

    return res.json({
      message: 'Transactions synced successfully.',
      stats: { added: totalAdded, modified: totalModified, removed: totalRemoved },
    });
  } catch (err) {
    console.error('Transaction sync error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to sync transactions.' });
  }
});

// GET /api/transactions
// Fetch transactions with optional filters
router.get('/', authMiddleware, async (req, res) => {
  const {
    start_date,
    end_date,
    category,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['user_id = $1'];
  const params = [req.user.id];
  let paramIndex = 2;

  if (start_date) {
    conditions.push(`date >= $${paramIndex++}`);
    params.push(start_date);
  }
  if (end_date) {
    conditions.push(`date <= $${paramIndex++}`);
    params.push(end_date);
  }
  if (category) {
    conditions.push(`category ILIKE $${paramIndex++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(merchant_name ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, plaid_transaction_id, amount, category, subcategory, merchant_name, name, date, pending
         FROM transactions
         WHERE ${whereClause}
         ORDER BY date DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM transactions WHERE ${whereClause}`, params),
    ]);

    return res.json({
      transactions: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get transactions error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// GET /api/transactions/summary
// Returns aggregated data for charts and AI context
router.get('/summary', authMiddleware, async (req, res) => {
  const { start_date, end_date } = req.query;

  // Default to current month if no range provided
  const now = new Date();
  const startDate = start_date || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = end_date || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  try {
    const [categoryResult, merchantResult, totalResult, dailyResult] = await Promise.all([
      // Category breakdown
      pool.query(
        `SELECT category, SUM(amount) as total, COUNT(*) as count
         FROM transactions
         WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND pending = false AND amount > 0
         GROUP BY category ORDER BY total DESC`,
        [req.user.id, startDate, endDate]
      ),
      // Top merchants
      pool.query(
        `SELECT COALESCE(merchant_name, name) as merchant, SUM(amount) as total, COUNT(*) as count
         FROM transactions
         WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND pending = false AND amount > 0
         GROUP BY merchant ORDER BY total DESC LIMIT 10`,
        [req.user.id, startDate, endDate]
      ),
      // Total spent
      pool.query(
        `SELECT SUM(amount) as total_spent, MAX(amount) as biggest_transaction,
                MIN(amount) as smallest_transaction, COUNT(*) as transaction_count
         FROM transactions
         WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND pending = false AND amount > 0`,
        [req.user.id, startDate, endDate]
      ),
      // Daily spending
      pool.query(
        `SELECT date, SUM(amount) as daily_total
         FROM transactions
         WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND pending = false AND amount > 0
         GROUP BY date ORDER BY date ASC`,
        [req.user.id, startDate, endDate]
      ),
    ]);

    return res.json({
      period: { start_date: startDate, end_date: endDate },
      summary: totalResult.rows[0],
      by_category: categoryResult.rows,
      top_merchants: merchantResult.rows,
      daily_spending: dailyResult.rows,
    });
  } catch (err) {
    console.error('Get summary error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transaction summary.' });
  }
});

// POST /api/transactions
// Log a manual transaction
router.post('/', authMiddleware, async (req, res) => {
  const { amount, category, merchant_name, name, date } = req.body;
  if (amount == null || !name || !date) {
    return res.status(400).json({ error: 'Amount, description/name, and date are required' });
  }

  try {
    const crypto = require('crypto');
    const manualId = `manual_${crypto.randomUUID()}`;
    
    const result = await pool.query(
      `INSERT INTO transactions
         (user_id, plaid_transaction_id, amount, category, merchant_name, name, date, is_manual, pending)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
       RETURNING *`,
      [req.user.id, manualId, parseFloat(amount), category || 'Other', merchant_name || null, name, date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error logging manual transaction:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/transactions/:id
// Delete a manual transaction
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND is_manual = TRUE RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or not a manual transaction' });
    }

    res.json({ message: 'Transaction deleted successfully', transaction: result.rows[0] });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/transactions/monthly-compare
// Returns category spending for current vs previous month
router.get('/monthly-compare', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Current month range
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const currEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Previous month range
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [currResult, prevResult] = await Promise.all([
      pool.query(
        `SELECT category, SUM(amount) AS total
         FROM transactions
         WHERE user_id = $1 AND date >= $2 AND date <= $3 AND amount > 0
         GROUP BY category ORDER BY total DESC`,
        [userId, currStart, currEnd]
      ),
      pool.query(
        `SELECT category, SUM(amount) AS total
         FROM transactions
         WHERE user_id = $1 AND date >= $2 AND date <= $3 AND amount > 0
         GROUP BY category ORDER BY total DESC`,
        [userId, prevStart, prevEnd]
      ),
    ]);

    // Build a unified category list
    const allCategories = new Set([
      ...currResult.rows.map(r => r.category),
      ...prevResult.rows.map(r => r.category),
    ]);

    const currMap = Object.fromEntries(currResult.rows.map(r => [r.category, Number(r.total)]));
    const prevMap = Object.fromEntries(prevResult.rows.map(r => [r.category, Number(r.total)]));

    const comparison = [...allCategories].map(cat => {
      const curr = currMap[cat] || 0;
      const prev = prevMap[cat] || 0;
      const diff = curr - prev;
      const pct  = prev > 0 ? Math.round((diff / prev) * 100) : (curr > 0 ? 100 : 0);
      return { category: cat, current: curr, previous: prev, diff, pct };
    }).sort((a, b) => b.current - a.current);

    // Overall totals
    const totalCurrent  = currResult.rows.reduce((s, r) => s + Number(r.total), 0);
    const totalPrevious = prevResult.rows.reduce((s, r) => s + Number(r.total), 0);
    const totalDiff     = totalCurrent - totalPrevious;
    const totalPct      = totalPrevious > 0 ? Math.round((totalDiff / totalPrevious) * 100) : (totalCurrent > 0 ? 100 : 0);

    return res.json({
      current_month:  { label: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }), start: currStart, end: currEnd },
      previous_month: { label: new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }), start: prevStart, end: prevEnd },
      summary: { total_current: totalCurrent, total_previous: totalPrevious, total_diff: totalDiff, total_pct: totalPct },
      categories: comparison.slice(0, 8),
    });
  } catch (err) {
    console.error('Monthly compare error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch monthly comparison.' });
  }
});

module.exports = { router, syncItemTransactions };

