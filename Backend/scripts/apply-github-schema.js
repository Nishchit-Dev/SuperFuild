const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function applyGitHubSchema() {
    try {
        console.log('🔧 Applying GitHub integration schema...');
        
        // Read the GitHub schema file
        const schemaPath = path.join(__dirname, '..', 'database', 'github-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the entire schema in a single batch to preserve statement order and dependencies
        console.log('⏳ Executing schema as a single batch...');
        await pool.query(schema);
        console.log('🎉 GitHub schema applied successfully!');
        console.log('📊 New tables created:');
        console.log('   - github_accounts');
        console.log('   - repositories');
        console.log('   - scan_jobs');
        console.log('   - scan_results');
        console.log('   - vulnerability_details');
        console.log('   - scan_history');
        console.log('   - user_preferences');
        
    } catch (error) {
        console.error('❌ Failed to apply GitHub schema:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Test database connection first
async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n💡 Please check:');
        console.log('   1. PostgreSQL is running');
        console.log('   2. Database credentials in .env file');
        console.log('   3. Database "aisecure_auth" exists');
        return false;
    }
}

async function main() {
    const connected = await testConnection();
    if (connected) {
        await applyGitHubSchema();
    }
}

main();

