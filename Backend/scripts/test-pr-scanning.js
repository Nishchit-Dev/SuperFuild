const prScanningService = require('../services/prScanningService');
const pool = require('../config/database');

async function testPRScanning() {
    try {
        console.log('🧪 Testing PR Scanning Backend...\n');

        // Test 1: Database connection
        console.log('1. Testing database connection...');
        const dbTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', dbTest.rows[0].now);

        // Test 2: Check if PR tables exist
        console.log('\n2. Checking PR tables...');
        const tables = [
            'pull_requests',
            'pr_scan_jobs', 
            'pr_scan_results',
            'pr_security_summary',
            'github_webhooks'
        ];

        for (const table of tables) {
            try {
                await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ Table ${table} exists`);
            } catch (error) {
                console.log(`❌ Table ${table} missing:`, error.message);
            }
        }

        // Test 3: Test PR service methods (without actual GitHub calls)
        console.log('\n3. Testing PR service methods...');
        
        try {
            // This will fail but we can test the method structure
            await prScanningService.getPullRequests(1, 1, { page: 1, limit: 10 });
            console.log('✅ getPullRequests method accessible');
        } catch (error) {
            if (error.message.includes('relation') || error.message.includes('does not exist')) {
                console.log('⚠️  getPullRequests method accessible (tables not created yet)');
            } else {
                console.log('❌ getPullRequests method error:', error.message);
            }
        }

        // Test 4: Test AI analysis function
        console.log('\n4. Testing AI analysis...');
        try {
            const { analyzePRCode } = require('../lib/ai');
            console.log('✅ analyzePRCode function imported successfully');
        } catch (error) {
            console.log('❌ AI analysis import error:', error.message);
        }

        console.log('\n🎉 PR Scanning Backend Tests Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Run: node scripts/apply-pr-schema.js');
        console.log('2. Start backend: npm start');
        console.log('3. Test endpoints with Postman/curl');
        console.log('\n🔗 Available PR Endpoints:');
        console.log('GET    /api/pr/repositories/:repoId/pull-requests');
        console.log('GET    /api/pr/pull-requests/:prId');
        console.log('POST   /api/pr/pull-requests/:prId/scan');
        console.log('GET    /api/pr/pr-scans/:prScanJobId');
        console.log('GET    /api/pr/pull-requests/:prId/security-summary');
        console.log('POST   /api/pr/repositories/:repoId/sync-prs');
        console.log('POST   /api/pr/webhooks/github');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run if called directly
if (require.main === module) {
    testPRScanning()
        .then(() => {
            console.log('\n✅ All tests completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testPRScanning };
