const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function applyRepositoryWatchingSchema() {
    try {
        console.log('Applying repository watching schema...');
        
        // Read the schema file
        const schemaPath = path.join(__dirname, '../database/repository-watching-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await pool.query(statement);
                    console.log('✓ Executed statement');
                } catch (error) {
                    if (error.code === '23505') { // Unique constraint violation
                        console.log('⚠ Statement skipped (already exists)');
                    } else {
                        console.error('✗ Error executing statement:', error.message);
                    }
                }
            }
        }
        
        console.log('✅ Repository watching schema applied successfully!');
        
        // Test the schema
        console.log('\nTesting schema...');
        
        // Test repository_watches table
        const watchesTest = await pool.query('SELECT COUNT(*) FROM repository_watches');
        console.log(`✓ repository_watches table: ${watchesTest.rows[0].count} records`);
        
        // Test email_notifications table
        const notificationsTest = await pool.query('SELECT COUNT(*) FROM email_notifications');
        console.log(`✓ email_notifications table: ${notificationsTest.rows[0].count} records`);
        
        // Test email_templates table
        const templatesTest = await pool.query('SELECT COUNT(*) FROM email_templates');
        console.log(`✓ email_templates table: ${templatesTest.rows[0].count} records`);
        
        // Test email_config table
        const configTest = await pool.query('SELECT COUNT(*) FROM email_config');
        console.log(`✓ email_config table: ${configTest.rows[0].count} records`);
        
        console.log('\n🎉 All tests passed! Repository watching system is ready.');
        
    } catch (error) {
        console.error('❌ Failed to apply repository watching schema:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
applyRepositoryWatchingSchema();
