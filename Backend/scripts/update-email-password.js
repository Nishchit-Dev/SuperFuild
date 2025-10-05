const pool = require('../config/database');

async function updateEmailPassword() {
    try {
        console.log('🔧 Updating email password in database...\n');
        
        // You need to replace this with your actual app password
        const appPassword = 'your-16-character-app-password-here';
        
        if (appPassword === 'your-16-character-app-password-here') {
            console.log('❌ Please update the appPassword variable in this script first!');
            console.log('\n📝 Steps:');
            console.log('1. Get your Gmail App Password from: https://myaccount.google.com/apppasswords');
            console.log('2. Update the appPassword variable in this script');
            console.log('3. Run this script again');
            return;
        }
        
        // Update the password in the database
        const query = 'UPDATE email_config SET smtp_password = $1 WHERE is_active = TRUE';
        const result = await pool.query(query, [appPassword]);
        
        if (result.rowCount > 0) {
            console.log('✅ Email password updated successfully!');
            
            // Test the configuration
            console.log('\n🧪 Testing email configuration...');
            const configQuery = 'SELECT * FROM email_config WHERE is_active = TRUE LIMIT 1';
            const configResult = await pool.query(configQuery);
            
            if (configResult.rows.length > 0) {
                const config = configResult.rows[0];
                console.log('📧 Current configuration:');
                console.log(`   Email: ${config.smtp_user}`);
                console.log(`   SMTP Host: ${config.smtp_host}`);
                console.log(`   SMTP Port: ${config.smtp_port}`);
                console.log(`   From Name: ${config.from_name}`);
                
                // Test SMTP connection
                try {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransporter({
                        host: config.smtp_host,
                        port: config.smtp_port,
                        secure: config.smtp_secure,
                        auth: {
                            user: config.smtp_user,
                            pass: config.smtp_password
                        }
                    });
                    
                    await transporter.verify();
                    console.log('✅ SMTP connection test successful!');
                    console.log('🎉 Email configuration is ready!');
                } catch (error) {
                    console.log('❌ SMTP connection test failed:', error.message);
                    console.log('\n🔧 Troubleshooting:');
                    console.log('1. Double-check your App Password');
                    console.log('2. Make sure 2FA is enabled');
                    console.log('3. Try generating a new App Password');
                }
            }
        } else {
            console.log('❌ No active email configuration found. Run setup-email-simple.js first.');
        }
        
    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        await pool.end();
    }
}

updateEmailPassword();
