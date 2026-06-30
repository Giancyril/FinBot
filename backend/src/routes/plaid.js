const express = require('express');
const plaidClient = require('../config/plaidClient');
const pool = require('../config/db');
const { encrypt } = require('../services/cryptoService');
const authMiddleware = require('../middleware/auth');
const { CountryCode, Products } = require('plaid');

const router = express.Router();

// POST /api/plaid/create-link-token
// Creates a short-lived link token to initialize Plaid Link widget
router.post('/create-link-token', authMiddleware, async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.user.id },
      client_name: 'Personal Finance Chatbot',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid create-link-token error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create Plaid link token.' });
  }
});

// POST /api/plaid/exchange-token
// Exchanges public_token for permanent access_token, stores encrypted
router.post('/exchange-token', authMiddleware, async (req, res) => {
  const { public_token, institution_name } = req.body;

  if (!public_token) {
    return res.status(400).json({ error: 'public_token is required.' });
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeResponse.data;

    // Encrypt access_token before storing — never log raw access_token
    const accessTokenEncrypted = encrypt(access_token);

    // Upsert plaid_item
    await pool.query(
      `INSERT INTO plaid_items (user_id, access_token_encrypted, item_id, institution_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_id) DO UPDATE
         SET access_token_encrypted = EXCLUDED.access_token_encrypted,
             institution_name = EXCLUDED.institution_name`,
      [req.user.id, accessTokenEncrypted, item_id, institution_name || 'Unknown']
    );

    return res.json({ success: true, item_id, institution_name });
  } catch (err) {
    console.error('Plaid exchange-token error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to exchange Plaid token.' });
  }
});

// GET /api/plaid/items
// List connected bank accounts for the current user
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, institution_name, last_synced_at, created_at FROM plaid_items WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('Get plaid items error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch connected accounts.' });
  }
});

module.exports = router;
