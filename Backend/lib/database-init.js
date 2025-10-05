const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseInitializer {
    constructor() {
        this.setupPool = null;
        this.appPool = null;
    }

    async initialize() {
        try {
            console.log('🔧 Initializing database...');
            console.log('📋 Environment variables:');
            console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
            console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
            console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
            console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
            
            // Step 1: Test connection and find working password
            const password = await this.findWorkingPassword();
            if (!password) {
                throw new Error('Could not connect to PostgreSQL with any common password');
            }
            
            // Step 2: Create database if it doesn't exist
            await this.createDatabase(password);
            
            // Step 3: Create tables if they don't exist
            await this.createTables(password);
            
            console.log('✅ Database initialization complete!');
            return true;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            return false;
        }
    }

    async findWorkingPassword() {
        // First try the environment variable password
        if (process.env.DB_PASSWORD) {
            try {
                console.log(`🔍 Testing environment password...`);
                
                const testPool = new Pool({
                    host: process.env.DB_HOST || 'localhost',
                    port: process.env.DB_PORT || 5432,
                    database: 'postgres',
                    user: process.env.DB_USER || 'postgres',
                    password: process.env.DB_PASSWORD,
                });
                
                await testPool.query('SELECT NOW()');
                console.log(`✅ Connection successful with environment password`);
                
                await testPool.end();
                return process.env.DB_PASSWORD;
                
            } catch (error) {
                console.log(`❌ Environment password failed: ${error.message}`);
            }
        }
        
        // If environment password fails, try common passwords
        const passwords = ['postgres', 'admin', 'password', '123456', ''];
        
        for (const password of passwords) {
            try {
                console.log(`🔍 Testing password: ${password || '(empty)'}`);
                
                const testPool = new Pool({
                    host: process.env.DB_HOST || 'localhost',
                    port: process.env.DB_PORT || 5432,
                    database: 'postgres',
                    user: process.env.DB_USER || 'postgres',
                    password: password,
                });
                
                await testPool.query('SELECT NOW()');
                console.log(`✅ Connection successful with password: ${password || '(empty)'}`);
                
                await testPool.end();
                return password;
                
            } catch (error) {
                console.log(`❌ Failed with password: ${password || '(empty)'}`);
                continue;
            }
        }
        
        return null;
    }

    async createDatabase(password) {
        this.setupPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: password,
        });

        try {
            console.log('📝 Creating database...');
            await this.setupPool.query('CREATE DATABASE aisecure_auth');
            console.log('✅ Database created successfully');
        } catch (error) {
            if (error.code === '42P04') {
                console.log('⚠️  Database already exists, continuing...');
            } else {
                throw error;
            }
        }
    }

    async createTables(password) {
        this.appPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: 'aisecure_auth',
            user: process.env.DB_USER || 'postgres',
            password: password,
        });

        try {
            // Check if tables already exist
            const result = await this.appPool.query(`
                SELECT COUNT(*) as table_count 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            
            if (result.rows[0].table_count > 0) {
                console.log('⚠️  Tables already exist, skipping creation');
                return;
            }

            // Create basic tables
            console.log('📊 Creating basic tables...');
            const basicSchema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
            await this.appPool.query(basicSchema);
            console.log('✅ Basic tables created');

            // Create GitHub tables
            console.log('🔗 Creating GitHub integration tables...');
            const githubSchema = fs.readFileSync(path.join(__dirname, '..', 'database', 'github-schema.sql'), 'utf8');
            await this.appPool.query(githubSchema);
            console.log('✅ GitHub tables created');

            // Verify tables were created
            const finalResult = await this.appPool.query(`
                SELECT COUNT(*) as table_count 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            console.log(`✅ Found ${finalResult.rows[0].table_count} tables in database`);

        } catch (error) {
            console.error('❌ Error creating tables:', error.message);
            throw error;
        }
    }

    async cleanup() {
        if (this.setupPool) {
            await this.setupPool.end();
        }
        if (this.appPool) {
            await this.appPool.end();
        }
    }
}

module.exports = DatabaseInitializer;
