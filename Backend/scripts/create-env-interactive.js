const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createEnvFile() {
    console.log('🔧 Interactive .env File Creator');
    console.log('================================');
    console.log('This will help you create the .env file with the correct database credentials.\n');

    try {
        // Get PostgreSQL password
        const dbPassword = await question('Enter your PostgreSQL password (for user "postgres"): ');
        
        // Get JWT secret
        const jwtSecret = await question('Enter a JWT secret (or press Enter for auto-generated): ');
        const finalJwtSecret = jwtSecret || 'your-super-secret-jwt-key-' + Math.random().toString(36).substring(2, 15);
        
        // Get GitHub OAuth credentials
        const githubClientId = await question('Enter your GitHub Client ID (or press Enter to skip): ');
        const githubClientSecret = await question('Enter your GitHub Client Secret (or press Enter to skip): ');
        
        // Get Gemini API key
        const geminiApiKey = await question('Enter your Gemini API key (or press Enter to skip): ');

        // Create .env content
        const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aisecure_auth
DB_USER=postgres
DB_PASSWORD=${dbPassword}

# JWT Configuration
JWT_SECRET=${finalJwtSecret}
JWT_EXPIRES_IN=24h

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=${githubClientId || 'your-github-client-id'}
GITHUB_CLIENT_SECRET=${githubClientSecret || 'your-github-client-secret'}
GITHUB_REDIRECT_URI=http://localhost:4000/api/github/callback

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# AI Configuration
GEMINI_API_KEY=${geminiApiKey || 'your-gemini-api-key'}
`;

        // Write .env file
        const envPath = path.join(__dirname, '..', '.env');
        fs.writeFileSync(envPath, envContent);
        
        console.log('\n✅ .env file created successfully!');
        console.log(`📁 Location: ${envPath}`);
        console.log('\n📋 Environment variables set:');
        console.log(`   DB_PASSWORD: ${dbPassword ? '***SET***' : 'NOT SET'}`);
        console.log(`   JWT_SECRET: ${finalJwtSecret ? '***SET***' : 'NOT SET'}`);
        console.log(`   GITHUB_CLIENT_ID: ${githubClientId ? '***SET***' : 'NOT SET'}`);
        console.log(`   GITHUB_CLIENT_SECRET: ${githubClientSecret ? '***SET***' : 'NOT SET'}`);
        console.log(`   GEMINI_API_KEY: ${geminiApiKey ? '***SET***' : 'NOT SET'}`);
        
        console.log('\n🚀 Next steps:');
        console.log('1. Run: node Backend/scripts/setup-complete-database.js');
        console.log('2. Run: cd Backend && npm start');
        
    } catch (error) {
        console.error('❌ Error creating .env file:', error.message);
    } finally {
        rl.close();
    }
}

createEnvFile();











