const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function createTestData() {
    const client = await pool.connect();
    
    try {
        console.log('Creating test data for scanning...');
        
        // Check if data already exists
        const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
        if (usersCount.rows[0].count > 0) {
            console.log('✅ Test data already exists');
            return;
        }
        
        // Create a test user
        console.log('Creating test user...');
        // Simple hash for testing (not secure for production)
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update('testpassword123').digest('hex');
        
        const userResult = await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email
        `, ['test@example.com', hashedPassword, 'Test', 'User']);
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Created user: ID ${userId}, Email: ${userResult.rows[0].email}`);
        
        // Create a test GitHub account
        console.log('Creating test GitHub account...');
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
        const ALGORITHM = 'aes-256-cbc';
        
        function encrypt(text) {
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        }
        
        const fakeToken = 'ghp_test1234567890abcdefghijklmnopqrstuvwxyz';
        const encryptedToken = encrypt(fakeToken);
        const tokenHash = crypto.createHash('sha256').update(fakeToken).digest('hex');
        
        const githubAccountResult = await client.query(`
            INSERT INTO github_accounts (user_id, github_id, username, display_name, avatar_url, access_token_encrypted, access_token_hash, scopes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, username
        `, [
            userId,
            12345, // fake GitHub ID
            'Nishchit-Dev',
            'Nishchit Dev',
            'https://avatars.githubusercontent.com/u/12345?v=4',
            encryptedToken,
            tokenHash,
            ['repo', 'read:user']
        ]);
        
        const githubAccountId = githubAccountResult.rows[0].id;
        console.log(`✅ Created GitHub account: ID ${githubAccountId}, Username: ${githubAccountResult.rows[0].username}`);
        
        // Create a test repository using a real GitHub repository
        console.log('Creating test repository...');
        const repoResult = await client.query(`
            INSERT INTO repositories (github_account_id, github_repo_id, name, full_name, description, language, is_private, default_branch, clone_url, html_url, last_commit_sha)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, name, full_name
        `, [
            githubAccountId,
            1056284129, // Real GitHub repo ID from our debug output
            'Test-Repo',
            'Nishchit-Dev/Test-Repo',
            'A test repository for scanning',
            'JavaScript',
            false,
            'master',
            'https://github.com/Nishchit-Dev/Test-Repo.git',
            'https://github.com/Nishchit-Dev/Test-Repo',
            'abc123def456'
        ]);
        
        const repoId = repoResult.rows[0].id;
        console.log(`✅ Created repository: ID ${repoId}, Name: ${repoResult.rows[0].name}`);
        
        // Create a test scan job
        console.log('Creating test scan job...');
        const scanJobResult = await client.query(`
            INSERT INTO scan_jobs (user_id, repository_id, status, scan_type, target_branch, target_commit_sha, started_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, status
        `, [
            userId,
            repoId,
            'completed',
            'full',
            'main',
            'abc123def456',
            new Date()
        ]);
        
        const scanJobId = scanJobResult.rows[0].id;
        console.log(`✅ Created scan job: ID ${scanJobId}, Status: ${scanJobResult.rows[0].status}`);
        
        console.log('\n🎉 Test data created successfully!');
        console.log('You can now test repository scanning with:');
        console.log(`  User ID: ${userId}`);
        console.log(`  Repository ID: ${repoId}`);
        console.log(`  Scan Job ID: ${scanJobId}`);
        
    } catch (error) {
        console.error('Error creating test data:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createTestData();
