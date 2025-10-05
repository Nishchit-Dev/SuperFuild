const pool = require('../config/database');

async function setupGmailConfig() {
    try {
        console.log('🔧 Setting up Gmail email configuration...\n');
        
        // Gmail SMTP settings
        const smtpHost = 'smtp.gmail.com';
        const smtpPort = 587;
        const smtpSecure = false; // Use STARTTLS
        const smtpUser = 'nishchitpatel84@gmail.com'; // You need to change this
        const smtpPassword = 'zequ eeky ramo zlmb'; // You need to change this
        const fromEmail = 'nishchitpatel84@gmail.com'; // You need to change this
        const fromName = 'AISecure';
        
        console.log('⚠️  IMPORTANT: You need to update the email credentials in this script!');
        console.log('📧 Current settings:');
        console.log(`   SMTP Host: ${smtpHost}`);
        console.log(`   SMTP Port: ${smtpPort}`);
        console.log(`   SMTP User: ${smtpUser}`);
        console.log(`   From Email: ${fromEmail}`);
        console.log('\n🔐 To use Gmail:');
        console.log('1. Enable 2-factor authentication on your Google account');
        console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
        console.log('3. Update the smtpUser and smtpPassword in this script');
        console.log('4. Run this script again\n');
        
        // Deactivate existing configs
        await pool.query('UPDATE email_config SET is_active = FALSE');
        
        // Insert new config
        const query = `
            INSERT INTO email_config 
            (smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, from_email, from_name, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        `;
        
        await pool.query(query, [
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword,
            fromEmail,
            fromName
        ]);
        
        console.log('✅ Gmail configuration saved to database!');
        console.log('\n📝 Next steps:');
        console.log('1. Update the email credentials in this script');
        console.log('2. Run: node scripts/setup-gmail-config.js');
        console.log('3. Test the email configuration from the frontend');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await pool.end();
    }
}

setupGmailConfig();
