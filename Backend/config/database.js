const { Pool } = require('pg')
const { env } = require('../scripts/env')
// Database configuration with better error handling
const dbConfig = {
    user: env.DB_USER,
    host: env.DB_HOST || 'localhost',
    database: env.DB_NAME || 'aisecure_auth',
    password: env.DB_PASSWORD || 'RaTHACKER@84',
    port: parseInt(env.DB_PORT) || 5432,
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}

const pool = new Pool(dbConfig)

// Test database connection with better error handling
pool.on('connect', (client) => {
    console.log('✅ Connected to PostgreSQL database')
})

pool.on('error', (err, client) => {
    console.error('❌ Database connection error:', err.message)
    console.error('Database config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password ? '***' : 'NOT SET',
    })

    if (err.code === '28P01') {
        console.error(
            '🔐 Authentication failed. Please check your database credentials.'
        )
        console.error('Make sure to set DB_PASSWORD in your .env file')
    } else if (err.code === 'ECONNREFUSED') {
        console.error(
            '🔌 Connection refused. Please make sure PostgreSQL is running.'
        )
    } else if (err.code === '3D000') {
        console.error(
            '📁 Database does not exist. Please create the database first.'
        )
    }
})

// Test connection on startup
async function testConnection() {
    try {
        const client = await pool.connect()
        const result = await client.query('SELECT NOW()')
        console.log('✅ Database connection test successful:', result.rows[0])
        client.release()
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message)
        console.error(
            'Please check your database configuration and ensure PostgreSQL is running.'
        )
        process.exit(1)
    }
}

// Test connection when module loads
testConnection()

module.exports = pool
