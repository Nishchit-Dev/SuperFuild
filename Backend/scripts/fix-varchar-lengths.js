const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixVarcharLengths() {
    const client = await pool.connect();
    
    try {
        console.log('Starting VARCHAR length fixes...');
        
        // Update vulnerability_details table columns
        console.log('Updating vulnerability_details.category from VARCHAR(50) to VARCHAR(100)...');
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN category TYPE VARCHAR(100)
        `);
        
        console.log('Updating vulnerability_details.owasp_category from VARCHAR(50) to VARCHAR(100)...');
        await client.query(`
            ALTER TABLE vulnerability_details 
            ALTER COLUMN owasp_category TYPE VARCHAR(100)
        `);
        
        console.log('VARCHAR length fixes completed successfully!');
        
    } catch (error) {
        console.error('Error fixing VARCHAR lengths:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
fixVarcharLengths()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });



