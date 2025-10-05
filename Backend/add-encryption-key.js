const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const encryptionKey = 'ENCRYPTION_KEY=your-32-character-secret-key-here!';

try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    if (!envContent.includes('ENCRYPTION_KEY=')) {
        envContent += '\n' + encryptionKey + '\n';
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Added ENCRYPTION_KEY to .env file');
    } else {
        console.log('✅ ENCRYPTION_KEY already exists in .env file');
    }
} catch (error) {
    console.error('❌ Error adding ENCRYPTION_KEY:', error.message);
}
