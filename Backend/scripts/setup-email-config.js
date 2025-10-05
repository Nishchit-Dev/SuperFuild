const readline = require('readline');
const pool = require('../config/database');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function setupEmailConfig() {
    try {
        console.log('🔧 AISecure Email Configuration Setup\n');
        console.log('This will configure SMTP settings for email notifications.\n');

        // Check if config already exists
        const existingConfig = await pool.query('SELECT COUNT(*) FROM email_config WHERE is_active = TRUE');
        if (existingConfig.rows[0].count > 0) {
            const overwrite = await askQuestion('Email configuration already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('Setup cancelled.');
                process.exit(0);
            }
        }

        console.log('\n📧 SMTP Configuration:');
        const smtpHost = await askQuestion('SMTP Host (e.g., smtp.gmail.com): ');
        const smtpPort = await askQuestion('SMTP Port (default 587): ') || '587';
        const smtpSecure = await askQuestion('Use SSL/TLS? (y/N): ');
        const smtpUser = await askQuestion('SMTP Username: ');
        const smtpPassword = await askQuestion('SMTP Password: ');
        
        console.log('\n📨 Email Settings:');
        const fromEmail = await askQuestion('From Email Address: ');
        const fromName = await askQuestion('From Name (e.g., AISecure): ') || 'AISecure';

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
            parseInt(smtpPort),
            smtpSecure.toLowerCase() === 'y',
            smtpUser,
            smtpPassword,
            fromEmail,
            fromName
        ]);

        console.log('\n✅ Email configuration saved successfully!');

        // Test the configuration
        const testEmail = await askQuestion('\nSend test email? (y/N): ');
        if (testEmail.toLowerCase() === 'y') {
            const testEmailAddress = await askQuestion('Test email address: ');
            
            try {
                const emailService = require('../services/emailService');
                await emailService.initialize();
                
                const success = await emailService.sendEmail(
                    testEmailAddress,
                    'AISecure - Configuration Test',
                    '<h2>Configuration Test Successful!</h2><p>Your AISecure email configuration is working correctly.</p>',
                    'Configuration Test Successful! Your AISecure email configuration is working correctly.'
                );

                if (success) {
                    console.log('✅ Test email sent successfully!');
                } else {
                    console.log('❌ Failed to send test email. Please check your configuration.');
                }
            } catch (error) {
                console.log('❌ Email test failed:', error.message);
            }
        }

        console.log('\n🎉 Email configuration setup complete!');
        console.log('\nNext steps:');
        console.log('1. Start the email processing service');
        console.log('2. Set up repository watches');
        console.log('3. Configure GitHub webhooks (optional)');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Run the setup
setupEmailConfig();
