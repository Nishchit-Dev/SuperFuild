require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function restoreCompleteDatabase() {
    try {
        console.log('🔄 Restoring complete database schema...');
        
        // Read all schema files in the correct order
        const schemaFiles = [
            'database/schema.sql',                    // Basic users and sessions
            'database/github-schema.sql',            // GitHub integration
            'database/pr-scanning-schema.sql',        // PR scanning features
            'database/repository-watching-schema.sql' // Repository watching
        ];
        
        for (const schemaFile of schemaFiles) {
            console.log(`\n📄 Applying ${schemaFile}...`);
            
            const filePath = path.join(__dirname, '..', schemaFile);
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  File not found: ${filePath}`);
                continue;
            }
            
            const schemaContent = fs.readFileSync(filePath, 'utf8');
            
            // Split the content by semicolons and execute each statement
            const statements = schemaContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await pool.query(statement);
                        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
                    } catch (error) {
                        // Some statements might fail if tables/constraints already exist
                        if (error.code === '42P07' || error.code === '42710') {
                            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
                        } else {
                            console.error(`❌ Error executing: ${statement.substring(0, 50)}...`);
                            console.error(`   Error: ${error.message}`);
                        }
                    }
                }
            }
        }
        
        // Fix the foreign key constraint issue
        console.log('\n🔧 Fixing foreign key constraints...');
        
        // Drop the incorrect foreign key constraint if it exists
        try {
            await pool.query('ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_repository_id_fkey');
            console.log('✅ Dropped incorrect foreign key constraint');
        } catch (error) {
            console.log('⚠️  Could not drop constraint (may not exist):', error.message);
        }
        
        // Create the correct foreign key constraint
        try {
            await pool.query('ALTER TABLE scan_jobs ADD CONSTRAINT scan_jobs_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE');
            console.log('✅ Created correct foreign key constraint');
        } catch (error) {
            console.log('⚠️  Could not create constraint (may already exist):', error.message);
        }
        
        // Clean up old tables if they exist
        console.log('\n🧹 Cleaning up old tables...');
        const tablesToDrop = ['github_repositories', 'vulnerabilities', 'vulnerability_fixes'];
        
        for (const tableName of tablesToDrop) {
            try {
                const exists = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}')`);
                if (exists.rows[0].exists) {
                    await pool.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
                    console.log(`✅ Dropped old table: ${tableName}`);
                }
            } catch (error) {
                console.log(`⚠️  Could not drop table ${tableName}:`, error.message);
            }
        }
        
        // Verify the final schema
        console.log('\n🔍 Verifying final schema...');
        
        // Check tables
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        console.log('\n📋 Final tables:');
        tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
        
        // Check foreign key constraints for scan_jobs
        const constraints = await pool.query(`
            SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
                   ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'scan_jobs'
        `);
        
        console.log('\n🔗 scan_jobs foreign key constraints:');
        constraints.rows.forEach(row => {
            console.log(`  - ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
        
        console.log('\n✅ Database schema restoration completed successfully!');
        
    } catch (error) {
        console.error('❌ Error restoring database schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

restoreCompleteDatabase().catch(console.error);




