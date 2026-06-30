const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/subscriptions
// Detect recurring subscription transactions
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Fetch all transactions for the user, ordered by date desc
    const result = await pool.query(
      `SELECT amount, category, merchant_name, name, date
       FROM transactions
       WHERE user_id = $1 AND pending = FALSE
       ORDER BY date DESC`,
      [req.user.id]
    );

    const txs = result.rows;

    // Group transactions by normalized merchant name/description
    const groups = {};
    for (const tx of txs) {
      const rawName = tx.merchant_name || tx.name;
      if (!rawName) continue;

      // Simple normalization: lowercase and remove numbers/special chars
      const normName = rawName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!normName) continue;

      if (!groups[normName]) {
        groups[normName] = {
          displayName: rawName,
          transactions: [],
        };
      }
      groups[normName].transactions.push(tx);
    }

    const subscriptions = [];

    // Analyze each group
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      const txList = group.transactions;

      // Subscriptions must have at least 2 transactions to establish a pattern
      if (txList.length < 2) continue;

      // Sort by date ascending (oldest first)
      txList.sort((a, b) => new Date(a.date) - new Date(b.date));

      const intervals = [];
      const amounts = [];
      let isRecurring = false;
      let frequency = 'monthly';

      for (let i = 0; i < txList.length; i++) {
        amounts.push(Math.abs(Number(txList[i].amount)));

        if (i > 0) {
          const d1 = new Date(txList[i - 1].date);
          const d2 = new Date(txList[i].date);
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          intervals.push(diffDays);
        }
      }

      // Compute average interval and variance
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Check if amount variance is low (all within 5% or $2 of the average)
      const lowAmountVariance = amounts.every(amt => Math.abs(amt - avgAmount) < Math.max(2, avgAmount * 0.05));

      if (lowAmountVariance) {
        // Classify frequency based on average interval
        // Monthly: 25-35 days
        // Weekly: 6-9 days
        // Bi-weekly: 13-16 days
        if (avgInterval >= 25 && avgInterval <= 35) {
          isRecurring = true;
          frequency = 'monthly';
        } else if (avgInterval >= 12 && avgInterval <= 17) {
          isRecurring = true;
          frequency = 'bi-weekly';
        } else if (avgInterval >= 5 && avgInterval <= 9) {
          isRecurring = true;
          frequency = 'weekly';
        }
      }

      // If classified as recurring, estimate the next billing date
      if (isRecurring) {
        const lastTx = txList[txList.length - 1];
        const lastDate = new Date(lastTx.date);
        
        // Project next date based on frequency days
        const projectDays = frequency === 'monthly' ? 30 : frequency === 'bi-weekly' ? 14 : 7;
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + projectDays);

        subscriptions.push({
          name: group.displayName,
          amount: avgAmount,
          frequency,
          last_date: lastTx.date,
          next_date: nextDate.toISOString().split('T')[0],
          category: lastTx.category,
        });
      }
    }

    // Sort subscriptions by amount desc
    subscriptions.sort((a, b) => b.amount - a.amount);

    res.json(subscriptions);
  } catch (err) {
    console.error('Error detecting subscriptions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
