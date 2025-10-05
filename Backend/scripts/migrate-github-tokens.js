const pool = require('../config/database');

async function migrate() {
    try {
        console.log('🔧 Migrating github_accounts token columns...');
        // Add new columns if not exist
        await pool.query(`
            ALTER TABLE github_accounts
            ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
            ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
        `);

        // Keep existing hash columns; no backfill possible without plaintext
        console.log('✅ Columns ensured. Note: existing rows will need re-connect to store encrypted tokens.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();


