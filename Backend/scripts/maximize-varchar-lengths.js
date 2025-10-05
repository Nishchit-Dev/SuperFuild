const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function maximizeVarcharLengths() {
    const client = await pool.connect();
    
    try {
        console.log('Starting VARCHAR length maximization...');
        
        // Update vulnerability_details table
        console.log('Updating vulnerability_details table...');
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN category TYPE VARCHAR(500)
        `);
        console.log('✅ Updated category to VARCHAR(500)');
        
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN owasp_category TYPE VARCHAR(500)
        `);
        console.log('✅ Updated owasp_category to VARCHAR(500)');
        
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN cwe_id TYPE VARCHAR(50)
        `);
        console.log('✅ Updated cwe_id to VARCHAR(50)');
        
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN severity TYPE VARCHAR(50)
        `);
        console.log('✅ Updated severity to VARCHAR(50)');
        
        // Update repositories table
        console.log('Updating repositories table...');
        await client.query(`
            ALTER TABLE repositories 
            ALTER COLUMN language TYPE VARCHAR(100)
        `);
        console.log('✅ Updated language to VARCHAR(100)');
        
        // Update scan_jobs table
        console.log('Updating scan_jobs table...');
        await client.query(`
            ALTER TABLE scan_jobs 
            ALTER COLUMN status TYPE VARCHAR(50)
        `);
        console.log('✅ Updated status to VARCHAR(50)');
        
        await client.query(`
            ALTER TABLE scan_jobs 
            ALTER COLUMN scan_type TYPE VARCHAR(50)
        `);
        console.log('✅ Updated scan_type to VARCHAR(50)');
        
        // Update user_preferences table
        console.log('Updating user_preferences table...');
        await client.query(`
            ALTER TABLE user_preferences 
            ALTER COLUMN scan_schedule TYPE VARCHAR(50)
        `);
        console.log('✅ Updated scan_schedule to VARCHAR(50)');
        
        // Update PR scanning tables if they exist
        console.log('Updating PR scanning tables...');
        try {
            await client.query(`
                ALTER TABLE pr_scan_jobs 
                ALTER COLUMN scan_type TYPE VARCHAR(50)
            `);
            console.log('✅ Updated pr_scan_jobs.scan_type to VARCHAR(50)');
        } catch (error) {
            console.log('⚠️  pr_scan_jobs table not found, skipping...');
        }
        
        try {
            await client.query(`
                ALTER TABLE pr_scan_jobs 
                ALTER COLUMN status TYPE VARCHAR(50)
            `);
            console.log('✅ Updated pr_scan_jobs.status to VARCHAR(50)');
        } catch (error) {
            console.log('⚠️  pr_scan_jobs.status column not found, skipping...');
        }
        
        try {
            await client.query(`
                ALTER TABLE pr_scan_results 
                ALTER COLUMN change_type TYPE VARCHAR(50)
            `);
            console.log('✅ Updated pr_scan_results.change_type to VARCHAR(50)');
        } catch (error) {
            console.log('⚠️  pr_scan_results table not found, skipping...');
        }
        
        try {
            await client.query(`
                ALTER TABLE pr_security_summary 
                ALTER COLUMN recommendation TYPE VARCHAR(50)
            `);
            console.log('✅ Updated pr_security_summary.recommendation to VARCHAR(50)');
        } catch (error) {
            console.log('⚠️  pr_security_summary table not found, skipping...');
        }
        
        // Update repository watching tables if they exist
        console.log('Updating repository watching tables...');
        try {
            await client.query(`
                ALTER TABLE email_notifications 
                ALTER COLUMN notification_type TYPE VARCHAR(100)
            `);
            console.log('✅ Updated email_notifications.notification_type to VARCHAR(100)');
        } catch (error) {
            console.log('⚠️  email_notifications table not found, skipping...');
        }
        
        try {
            await client.query(`
                ALTER TABLE email_notifications 
                ALTER COLUMN status TYPE VARCHAR(50)
            `);
            console.log('✅ Updated email_notifications.status to VARCHAR(50)');
        } catch (error) {
            console.log('⚠️  email_notifications.status column not found, skipping...');
        }
        
        console.log('\n🎉 VARCHAR length maximization completed successfully!');
        
    } catch (error) {
        console.error('Error maximizing VARCHAR lengths:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
maximizeVarcharLengths()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });



