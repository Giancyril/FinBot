require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const plaidRoutes = require('./routes/plaid');
const { router: transactionRoutes } = require('./routes/transactions');
const chatRoutes = require('./routes/chat');
const budgetRoutes = require('./routes/budgets');
const savingsRoutes = require('./routes/savings');
const initTransactionCron = require('./cron/syncTransactions');
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate essential environment variables
const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'GEMINI_API_KEY',
];
const missing = requiredEnv.filter((env) => !process.env[env]);
if (missing.length > 0) {
  console.error(`FATAL: Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.ENCRYPTION_KEY.length !== 64) {
  console.error('FATAL: ENCRYPTION_KEY must be a 32-byte hex string (64 characters long).');
  process.exit(1);
}

// Enable CORS for frontend requests with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin) return callback(null, true);
      // Allow any localhost or 127.0.0.1 port in development
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost || origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingsRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', database: err.message });
  }
});

// Database initialization helper (creates tables if they do not exist)
async function initDatabase() {
  console.log('Initializing database schema...');
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err.message);
    process.exit(1);
  }
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
async function start() {
  await initDatabase();
  initTransactionCron();
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
  });
}

start();
