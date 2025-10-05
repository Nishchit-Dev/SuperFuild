require('dotenv').config();
const pool = require('../config/database');

async function fixForeignKeys() {
    try {
        console.log('🔧 Fixing foreign key constraints...');
        
        // Drop the incorrect foreign key constraint
        console.log('Dropping incorrect foreign key constraint...');
        await pool.query('ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_repository_id_fkey');
        
        // Create the correct foreign key constraint
        console.log('Creating correct foreign key constraint...');
        await pool.query('ALTER TABLE scan_jobs ADD CONSTRAINT scan_jobs_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE');
        
        // Check if github_repositories table exists and is empty
        const githubReposCheck = await pool.query('SELECT COUNT(*) as count FROM github_repositories');
        const githubReposCount = parseInt(githubReposCheck.rows[0].count);
        
        if (githubReposCount === 0) {
            console.log('Dropping empty github_repositories table...');
            await pool.query('DROP TABLE IF EXISTS github_repositories CASCADE');
        } else {
            console.log(`⚠️  github_repositories table has ${githubReposCount} records. Not dropping to avoid data loss.`);
            console.log('You may need to migrate data from github_repositories to repositories table manually.');
        }
        
        // Verify the fix
        console.log('Verifying foreign key constraints...');
        const constraints = await pool.query(`
            SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
                   ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'scan_jobs'
        `);
        
        console.log('Current scan_jobs foreign key constraints:');
        constraints.rows.forEach(row => {
            console.log(`- ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
        
        console.log('✅ Foreign key constraints fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing foreign key constraints:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

fixForeignKeys().catch(console.error);




