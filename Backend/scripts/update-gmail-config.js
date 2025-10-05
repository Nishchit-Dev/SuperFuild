const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function updateGmailConfig() {
    try {
        console.log('🔧 Gmail Configuration Setup');
        console.log('================================');
        console.log('');
        console.log('To use Gmail SMTP, you need:');
        console.log('1. A Gmail account with 2-Factor Authentication enabled');
        console.log('2. An App Password (not your regular Gmail password)');
        console.log('');
        console.log('To get an App Password:');
        console.log('1. Go to Gmail Settings > Security');
        console.log('2. Enable 2-Step Verification if not already enabled');
        console.log('3. Go to App passwords');
        console.log('4. Generate a new app password for "Mail"');
        console.log('5. Use that 16-character password below');
        console.log('');
        
        const email = await askQuestion('Enter your Gmail address: ');
        const appPassword = await askQuestion('Enter your Gmail App Password (16 characters): ');
        
        if (!email || !appPassword) {
            console.log('❌ Email and password are required');
            return;
        }
        
        if (!email.includes('@gmail.com')) {
            console.log('⚠️  Warning: This setup is for Gmail. Other providers may need different settings.');
        }
        
        console.log('\n📧 Updating email configuration...');
        
        // Update the email configuration
        await pool.query(`
            UPDATE email_config 
            SET smtp_user = $1, smtp_password = $2, from_email = $3
            WHERE is_active = true
        `, [email, appPassword, email]);
        
        console.log('✅ Email configuration updated successfully!');
        console.log(`📧 Using Gmail: ${email}`);
        console.log('🔑 Using App Password: ***' + appPassword.slice(-4));
        
        console.log('\n🧪 Testing email configuration...');
        
        // Test the configuration
        const emailService = require('../services/emailService');
        const initialized = await emailService.initialize();
        
        if (initialized) {
            console.log('✅ Email service initialized successfully!');
            console.log('📧 Ready to send emails!');
        } else {
            console.log('❌ Email service initialization failed');
            console.log('Please check your Gmail credentials and try again');
        }
        
    } catch (error) {
        console.error('❌ Error updating Gmail configuration:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Run the update
if (require.main === module) {
    updateGmailConfig()
        .then(() => {
            console.log('🎉 Setup completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { updateGmailConfig };
