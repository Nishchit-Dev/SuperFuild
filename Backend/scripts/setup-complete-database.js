const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres', // Connect to default postgres database first
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

console.log('🔧 Complete Database Setup Script');
console.log('================================');

async function setupCompleteDatabase() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('🔍 Testing database connection...');
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        
        // Step 1: Create the database if it doesn't exist
        console.log('\n📝 Creating database...');
        try {
            await client.query('CREATE DATABASE aisecure_auth');
            console.log('✅ Database "aisecure_auth" created successfully');
        } catch (error) {
            if (error.code === '42P04') {
                console.log('⚠️  Database "aisecure_auth" already exists, continuing...');
            } else {
                throw error;
            }
        }
        
        client.release();
        
        // Step 2: Connect to the new database
        const appDbConfig = {
            ...dbConfig,
            database: 'aisecure_auth'
        };
        
        const appPool = new Pool(appDbConfig);
        const appClient = await appPool.connect();
        console.log('✅ Connected to aisecure_auth database');
        
        // Step 3: Create basic tables
        console.log('\n📝 Creating basic tables...');
        const basicSchema = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- User sessions table
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);
        `;
        
        await appClient.query(basicSchema);
        console.log('✅ Basic tables created successfully');
        
        // Step 4: Create GitHub integration tables
        console.log('\n📝 Creating GitHub integration tables...');
        const githubSchema = `
            -- GitHub accounts table
            CREATE TABLE IF NOT EXISTS github_accounts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                github_id INTEGER UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                avatar_url TEXT,
                access_token TEXT NOT NULL,
                token_type VARCHAR(50) DEFAULT 'bearer',
                scope TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- GitHub repositories table
            CREATE TABLE IF NOT EXISTS github_repositories (
                id SERIAL PRIMARY KEY,
                github_account_id INTEGER REFERENCES github_accounts(id) ON DELETE CASCADE,
                github_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                description TEXT,
                private BOOLEAN DEFAULT FALSE,
                html_url TEXT,
                clone_url TEXT,
                default_branch VARCHAR(100),
                language VARCHAR(50),
                size INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(github_account_id, github_id)
            );

            -- Scan jobs table
            CREATE TABLE IF NOT EXISTS scan_jobs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                repository_id INTEGER REFERENCES github_repositories(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'pending',
                scan_type VARCHAR(50) DEFAULT 'security',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Vulnerabilities table
            CREATE TABLE IF NOT EXISTS vulnerabilities (
                id SERIAL PRIMARY KEY,
                scan_job_id INTEGER REFERENCES scan_jobs(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                severity VARCHAR(20) NOT NULL,
                file_path TEXT,
                line_number INTEGER,
                code_snippet TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Vulnerability fixes table
            CREATE TABLE IF NOT EXISTS vulnerability_fixes (
                id SERIAL PRIMARY KEY,
                vulnerability_id INTEGER REFERENCES vulnerabilities(id) ON DELETE CASCADE,
                fix_type VARCHAR(50) NOT NULL,
                fix_description TEXT,
                fix_code TEXT,
                confidence_score DECIMAL(3,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Scan history table
            CREATE TABLE IF NOT EXISTS scan_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                repository_id INTEGER REFERENCES github_repositories(id) ON DELETE CASCADE,
                scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                vulnerabilities_found INTEGER DEFAULT 0,
                scan_duration INTEGER, -- in seconds
                scan_status VARCHAR(50) DEFAULT 'completed'
            );

            -- User preferences table
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                github_account_id INTEGER REFERENCES github_accounts(id) ON DELETE CASCADE,
                auto_scan_enabled BOOLEAN DEFAULT FALSE,
                scan_frequency VARCHAR(20) DEFAULT 'weekly',
                notification_email BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, github_account_id)
            );

            -- Create indexes for GitHub tables
            CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON github_accounts(user_id);
            CREATE INDEX IF NOT EXISTS idx_github_accounts_github_id ON github_accounts(github_id);
            CREATE INDEX IF NOT EXISTS idx_repositories_account_id ON github_repositories(github_account_id);
            CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON github_repositories(github_id);
            CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs(user_id);
            CREATE INDEX IF NOT EXISTS idx_scan_jobs_repository_id ON scan_jobs(repository_id);
            CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan_job_id ON vulnerabilities(scan_job_id);
            CREATE INDEX IF NOT EXISTS idx_vulnerability_fixes_vulnerability_id ON vulnerability_fixes(vulnerability_id);
            CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_scan_history_repository_id ON scan_history(repository_id);
            CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
        `;
        
        await appClient.query(githubSchema);
        console.log('✅ GitHub integration tables created successfully');
        
        // Step 5: Verify tables exist
        console.log('\n🔍 Verifying tables...');
        const tablesResult = await appClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        appClient.release();
        await appPool.end();
        
        console.log('\n🎉 Complete database setup successful!');
        console.log('✅ Database: aisecure_auth');
        console.log('✅ Basic tables: users, user_sessions');
        console.log('✅ GitHub tables: github_accounts, github_repositories, scan_jobs, vulnerabilities, vulnerability_fixes, scan_history, user_preferences');
        console.log('\n🚀 You can now start the backend server!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the setup
setupCompleteDatabase().catch(console.error);











