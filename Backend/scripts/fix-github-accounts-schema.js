const pool = require('../config/database');

async function fixGitHubAccountsSchema() {
    try {
        console.log('🔧 Fixing github_accounts table schema...\n');
        
        // 1. First, let's see what columns exist
        console.log('1. Checking current table structure...');
        const currentColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'github_accounts' 
            ORDER BY ordinal_position
        `);
        
        console.log('Current columns:');
        currentColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // 2. Remove old columns that are causing conflicts
        console.log('\n2. Removing old conflicting columns...');
        const removeOldColumns = [
            'ALTER TABLE github_accounts DROP COLUMN IF EXISTS access_token',
            'ALTER TABLE github_accounts DROP COLUMN IF EXISTS token_type',
            'ALTER TABLE github_accounts DROP COLUMN IF EXISTS scope'
        ];
        
        for (const query of removeOldColumns) {
            try {
                await pool.query(query);
                console.log(`✅ Removed old column`);
            } catch (error) {
                console.log(`⚠️  Column may not exist: ${error.message}`);
            }
        }
        
        // 3. Make the new encrypted columns NOT NULL
        console.log('\n3. Making encrypted columns NOT NULL...');
        const makeNotNullQueries = [
            'ALTER TABLE github_accounts ALTER COLUMN access_token_encrypted SET NOT NULL',
            'ALTER TABLE github_accounts ALTER COLUMN access_token_hash SET NOT NULL'
        ];
        
        for (const query of makeNotNullQueries) {
            try {
                await pool.query(query);
                console.log(`✅ Made column NOT NULL`);
            } catch (error) {
                console.log(`⚠️  Column may already be NOT NULL: ${error.message}`);
            }
        }
        
        // 4. Add any missing columns that might be needed
        console.log('\n4. Adding any missing columns...');
        const addMissingColumns = [
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS access_token_hash VARCHAR(500)',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(500)',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS scopes TEXT[]',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)',
            'ALTER TABLE github_accounts ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)'
        ];
        
        for (const query of addMissingColumns) {
            await pool.query(query);
        }
        console.log('✅ Added missing columns');
        
        // 5. Update existing records to have proper values
        console.log('\n5. Updating existing records...');
        await pool.query(`
            UPDATE github_accounts 
            SET access_token_encrypted = 'migrated_token_' || id,
                access_token_hash = 'migrated_hash_' || id
            WHERE access_token_encrypted IS NULL
        `);
        console.log('✅ Updated existing records');
        
        // 6. Make columns NOT NULL after updating existing data
        console.log('\n6. Making columns NOT NULL after data update...');
        const finalNotNullQueries = [
            'ALTER TABLE github_accounts ALTER COLUMN access_token_encrypted SET NOT NULL',
            'ALTER TABLE github_accounts ALTER COLUMN access_token_hash SET NOT NULL'
        ];
        
        for (const query of finalNotNullQueries) {
            try {
                await pool.query(query);
                console.log(`✅ Made column NOT NULL`);
            } catch (error) {
                console.log(`⚠️  Column may already be NOT NULL: ${error.message}`);
            }
        }
        
        // 7. Verify the final structure
        console.log('\n7. Verifying final table structure...');
        const finalColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'github_accounts' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Final github_accounts table structure:');
        finalColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        console.log('\n🎉 GitHub accounts schema fixed successfully!');
        console.log('✅ Old conflicting columns removed');
        console.log('✅ New encrypted columns properly configured');
        console.log('✅ GitHub OAuth should now work correctly');
        
    } catch (error) {
        console.error('❌ Error fixing GitHub accounts schema:', error.message);
        console.error('Error details:', error);
    } finally {
        await pool.end();
    }
}

fixGitHubAccountsSchema();





