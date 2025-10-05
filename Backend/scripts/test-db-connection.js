const pool = require('../config/database');

async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');
        
        // Test basic connection
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful');
        console.log('📅 Current time:', result.rows[0].current_time);
        
        // Test if tables exist
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Tables found:', tablesResult.rows.map(row => row.table_name).join(', '));
        
        // Test if users table has the right structure
        const usersColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        if (usersColumns.rows.length > 0) {
            console.log('✅ Users table structure looks good');
        } else {
            console.log('⚠️  Users table not found or empty');
        }
        
        console.log('🎉 Database is ready!');
        return true;
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        if (error.code === '28P01') {
            console.log('💡 Hint: Check your database password in .env file');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 Hint: Make sure PostgreSQL is running');
        } else if (error.code === '3D000') {
            console.log('💡 Hint: Database "aisecure_auth" does not exist. Run the setup script first.');
        }
        
        return false;
    } finally {
        await pool.end();
    }
}

testConnection();











