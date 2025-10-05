const nodemailer = require('nodemailer');
const pool = require('../config/database');

async function testEmailDebug() {
    try {
        console.log('🔧 Testing email configuration...\n');
        
        // Get config from database
        const configQuery = 'SELECT * FROM email_config WHERE is_active = TRUE LIMIT 1';
        const result = await pool.query(configQuery);
        
        if (result.rows.length === 0) {
            console.log('❌ No email configuration found in database');
            return;
        }
        
        const config = result.rows[0];
        console.log('📧 Current configuration:');
        console.log(`   SMTP Host: ${config.smtp_host}`);
        console.log(`   SMTP Port: ${config.smtp_port}`);
        console.log(`   SMTP Secure: ${config.smtp_secure}`);
        console.log(`   SMTP User: ${config.smtp_user}`);
        console.log(`   From Email: ${config.from_email}`);
        console.log(`   From Name: ${config.from_name}`);
        console.log(`   Password: ${config.smtp_password ? '***SET***' : 'NOT SET'}`);
        
        // Create transporter
        console.log('\n🔌 Creating SMTP transporter...');
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_password
            }
        });
        
        // Test connection
        console.log('🧪 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        
        // Send test email
        console.log('📤 Sending test email...');
        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to: config.smtp_user, // Send to yourself
            subject: 'AISecure - Configuration Test',
            html: '<h2>Configuration Test Successful!</h2><p>Your AISecure email configuration is working correctly.</p>',
            text: 'Configuration Test Successful! Your AISecure email configuration is working correctly.'
        });
        
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your Gmail App Password');
        console.log('2. Make sure 2FA is enabled on your Google account');
        console.log('3. Try generating a new App Password');
        console.log('4. Check if "Less secure app access" is enabled (not recommended)');
        console.log('\n📝 Error details:');
        console.log(error);
    } finally {
        await pool.end();
    }
}

testEmailDebug();
