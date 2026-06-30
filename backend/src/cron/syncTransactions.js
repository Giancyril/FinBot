const cron = require('node-cron');
const pool = require('../config/db');
const { syncItemTransactions } = require('../routes/transactions');

/**
 * Initialize daily transaction sync cron job.
 * Runs at 2:00 AM every day.
 */
function initTransactionCron() {
  console.log('Registering transaction sync cron (Daily at 2 AM)...');
  
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Starting daily transaction sync...');
    try {
      // Get all Plaid items in the database
      const result = await pool.query(
        'SELECT id, user_id, access_token_encrypted, cursor FROM plaid_items'
      );

      console.log(`[Cron] Found ${result.rows.length} bank connections to sync.`);

      for (const item of result.rows) {
        try {
          console.log(`[Cron] Syncing item ${item.id} for user ${item.user_id}...`);
          const stats = await syncItemTransactions(item);
          console.log(`[Cron] Synced item ${item.id}: Added ${stats.added}, Modified ${stats.modified}, Removed ${stats.removed}`);
        } catch (itemErr) {
          console.error(`[Cron] Failed to sync item ${item.id}:`, itemErr.message);
        }
      }
      console.log('[Cron] Daily transaction sync completed.');
    } catch (err) {
      console.error('[Cron] Critical error in transaction sync job:', err.message);
    }
  });
}

module.exports = initTransactionCron;
