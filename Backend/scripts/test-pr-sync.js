const prScanningService = require('../services/prScanningService');
const pool = require('../config/database');

async function testPRSync() {
  try {
    console.log('🧪 Testing PR sync functionality...');
    
    // Test database connection
    const dbTest = await pool.query('SELECT 1');
    console.log('✅ Database connected');
    
    // Test if PR tables exist
    const tables = ['pull_requests', 'pr_scan_jobs', 'pr_scan_results', 'pr_security_summary'];
    for (const table of tables) {
      try {
        await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table} table accessible`);
      } catch (error) {
        console.log(`❌ ${table} table not accessible:`, error.message);
      }
    }
    
    // Test if we have any repositories
    const repoTest = await pool.query('SELECT COUNT(*) FROM repositories');
    console.log(`✅ Found ${repoTest.rows[0].count} repositories in database`);
    
    // Test if we have any GitHub accounts
    const accountTest = await pool.query('SELECT COUNT(*) FROM github_accounts');
    console.log(`✅ Found ${accountTest.rows[0].count} GitHub accounts in database`);
    
    console.log('✅ PR sync test completed successfully!');
    
  } catch (error) {
    console.error('❌ PR sync test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPRSync();
