const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function verifyDatabaseConnection() {
    const client = await pool.connect();
    
    try {
        console.log('=== Database Connection Verification ===');
        console.log('Environment variables:');
        console.log(`  DB_HOST: ${process.env.DB_HOST}`);
        console.log(`  DB_NAME: ${process.env.DB_NAME}`);
        console.log(`  DB_USER: ${process.env.DB_USER}`);
        console.log(`  DB_PORT: ${process.env.DB_PORT || 5432}`);
        
        // Check current database name
        const dbNameResult = await client.query('SELECT current_database()');
        console.log(`\nConnected to database: ${dbNameResult.rows[0].current_database}`);
        
        // Check vulnerability_details table columns
        console.log('\n=== Vulnerability Details Table ===');
        const vulnColumns = await client.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'vulnerability_details' 
            AND column_name IN ('category', 'owasp_category', 'cwe_id', 'severity')
            ORDER BY column_name
        `);
        
        vulnColumns.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
        });
        
        // Test inserting a long value
        console.log('\n=== Testing Long Value Insertion ===');
        const longCategory = 'A03:2021 – Injection - SQL Injection Vulnerability in Database Queries with Parameterized Statements and Input Validation and Security Best Practices';
        console.log(`Testing category length: ${longCategory.length} characters`);
        
        try {
            // Create a test scan result first
            const scanResultQuery = `
                INSERT INTO scan_results (scan_job_id, file_path, file_content_hash, vulnerabilities, fixes, ai_analysis_metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;
            
            const scanResult = await client.query(scanResultQuery, [
                21, // Use existing scan job ID
                'test-file.js',
                'test-hash',
                JSON.stringify([]),
                JSON.stringify([]),
                JSON.stringify({})
            ]);
            
            const scanResultId = scanResult.rows[0].id;
            
            // Test vulnerability insertion with long values
            await client.query(`
                INSERT INTO vulnerability_details 
                (scan_result_id, title, description, severity, category, line_number, column_number, code_snippet, cwe_id, owasp_category, confidence_score)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                scanResultId,
                'Test Vulnerability',
                'This is a test vulnerability description',
                'high',
                longCategory,
                1,
                null,
                'SELECT * FROM users WHERE id = $1',
                'CWE-89',
                longCategory,
                0.8
            ]);
            
            console.log('✅ Long values inserted successfully!');
            
            // Clean up
            await client.query('DELETE FROM vulnerability_details WHERE scan_result_id = $1', [scanResultId]);
            await client.query('DELETE FROM scan_results WHERE id = $1', [scanResultId]);
            console.log('Test data cleaned up');
            
        } catch (error) {
            console.error('❌ Error testing long values:', error.message);
            if (error.message.includes('value too long for type character varying')) {
                console.error('VARCHAR length issue still exists!');
                console.error('This means the migration was not applied to this database.');
            }
        }
        
    } catch (error) {
        console.error('Error verifying database connection:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyDatabaseConnection();



