const pool = require('../config/database');

async function checkScanJob(scanJobId) {
  try {
    console.log(`🔍 Checking PR scan job ID: ${scanJobId}`);
    
    // Check if scan job exists
    const scanJobQuery = `
      SELECT psj.*, pr.title as pr_title, pr.github_pr_id, r.name as repo_name, r.full_name as repo_full_name
      FROM pr_scan_jobs psj
      JOIN pull_requests pr ON psj.pull_request_id = pr.id
      JOIN repositories r ON psj.repository_id = r.id
      WHERE psj.id = $1
    `;
    
    const result = await pool.query(scanJobQuery, [scanJobId]);
    
    if (result.rows.length === 0) {
      console.log('❌ PR scan job not found');
      return;
    }
    
    const scanJob = result.rows[0];
    console.log('✅ PR scan job found:');
    console.log('  - ID:', scanJob.id);
    console.log('  - Status:', scanJob.status);
    console.log('  - Type:', scanJob.scan_type);
    console.log('  - PR:', scanJob.pr_title);
    console.log('  - Repository:', scanJob.repo_full_name);
    console.log('  - Started:', scanJob.started_at);
    console.log('  - Completed:', scanJob.completed_at);
    
    // Check scan results
    const resultsQuery = `
      SELECT COUNT(*) as count
      FROM pr_scan_results
      WHERE pr_scan_job_id = $1
    `;
    
    const results = await pool.query(resultsQuery, [scanJobId]);
    console.log('  - Results count:', results.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error checking scan job:', error.message);
  } finally {
    await pool.end();
  }
}

// Get scan job ID from command line argument
const scanJobId = process.argv[2];
if (!scanJobId) {
  console.log('Usage: node check-scan-job.js <scanJobId>');
  process.exit(1);
}

checkScanJob(parseInt(scanJobId));
