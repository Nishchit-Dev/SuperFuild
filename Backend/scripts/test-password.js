const { Pool } = require('pg');

// Common PostgreSQL passwords to test
const commonPasswords = [
    'postgres',
    'admin',
    'password',
    '123456',
    'root',
    'postgresql',
    'pgsql',
    'postgres123',
    'admin123',
    'password123'
];

async function testPassword(password) {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'aisecure_auth',
        password: password,
        port: 5432,
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log(`✅ SUCCESS! Password is: ${password}`);
        console.log('Database connection test:', result.rows[0]);
        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.log(`❌ Failed with password: ${password}`);
        await pool.end();
        return false;
    }
}

async function findCorrectPassword() {
    console.log('🔍 Testing common PostgreSQL passwords...\n');
    
    for (const password of commonPasswords) {
        const success = await testPassword(password);
        if (success) {
            console.log(`\n🎉 Found the correct password: ${password}`);
            console.log('Update your .env file with this password!');
            return;
        }
    }
    
    console.log('\n❌ None of the common passwords worked.');
    console.log('You may need to reset your PostgreSQL password.');
    console.log('\nTo reset password:');
    console.log('1. Open pgAdmin');
    console.log('2. Right-click on PostgreSQL server');
    console.log('3. Select "Properties" → "Connection"');
    console.log('4. Change the password there');
}

findCorrectPassword();
