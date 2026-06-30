require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

const CATEGORIES = {
  'Food and Drink': ['Starbucks', 'Uber Eats', 'McDonalds', 'Whole Foods', 'Chipotle', 'Sweetgreen'],
  'Shops': ['Amazon', 'Target', 'Apple Store', 'Nike', 'Best Buy', 'Zara'],
  'Travel': ['Uber', 'Lyft', 'Delta Air Lines', 'Shell Gas', 'Lime Bike'],
  'Service': ['Netflix', 'Spotify', 'AWS Cloud', 'Adobe Creative', 'Verizon Wireless'],
  'Recreation': ['Equinox Gym', 'AMC Theaters', 'Steam Games', 'City Park Golf'],
};

async function seed() {
  console.log('Starting database seeding...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL env var is not loaded! Check your backend/.env file.');
    process.exit(1);
  }

  try {
    // 1. Create tables first to ensure schema exists
    const fs = require('fs');
    const path = require('path');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Checked/created schema tables.');

    // 2. Clear old data for demo account
    const oldUserRes = await pool.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
    if (oldUserRes.rows.length > 0) {
      const demoUserId = oldUserRes.rows[0].id;
      console.log('Found existing demo user, clearing old data...');
      await pool.query('DELETE FROM users WHERE id = $1', [demoUserId]);
    }

    // 3. Create Demo User
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [DEMO_EMAIL, hashed]
    );
    const userId = userRes.rows[0].id;
    console.log(`Demo user created: ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);

    // 4. Create Plaid Item Link
    await pool.query(
      `INSERT INTO plaid_items (user_id, access_token_encrypted, item_id, institution_name, last_synced_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        userId,
        'iv-fake:tag-fake:ciphertext-fake',
        'item_demo_12345',
        'Chase Bank Sandbox',
      ]
    );
    console.log('Fake Plaid bank item connected.');

    // 5. Generate and insert realistic transactions for May & June 2026
    console.log('Generating mockup transaction logs...');
    
    // We will generate 35 transactions
    const txns = [];
    const now = new Date();
    
    // Set fixed seed dates to match June 2026 scope
    const baseDate = new Date(2026, 5, 29); // June 29, 2026
    
    for (let i = 0; i < 35; i++) {
      // Spread dates back by i days
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() - i);
      
      const category = Object.keys(CATEGORIES)[i % Object.keys(CATEGORIES).length];
      const merchants = CATEGORIES[category];
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      
      let amount = 0;
      if (category === 'Food and Drink') {
        amount = Number((Math.random() * 45 + 5).toFixed(2));
      } else if (category === 'Shops') {
        amount = Number((Math.random() * 250 + 10).toFixed(2));
      } else if (category === 'Travel') {
        amount = Number((Math.random() * 35 + 8).toFixed(2));
      } else if (category === 'Service') {
        amount = Number((Math.random() * 80 + 12).toFixed(2));
      } else { // Recreation
        amount = Number((Math.random() * 120 + 15).toFixed(2));
      }

      txns.push({
        plaid_transaction_id: `demo_tx_${i}_${Date.now()}`,
        amount,
        category,
        merchant_name: merchant,
        name: `${merchant} Charge`,
        date: date.toISOString().split('T')[0],
      });
    }

    // Insert to DB
    for (const tx of txns) {
      await pool.query(
        `INSERT INTO transactions
           (user_id, plaid_transaction_id, amount, category, subcategory, merchant_name, name, date, pending)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
        [
          userId,
          tx.plaid_transaction_id,
          tx.amount,
          tx.category,
          tx.category,
          tx.merchant_name,
          tx.name,
          tx.date,
        ]
      );
    }

    console.log(`Successfully seeded ${txns.length} mock transactions!`);
    console.log('Ready to test dashboard charts and AI finance Q&A.');
    
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
  }
}

seed();
