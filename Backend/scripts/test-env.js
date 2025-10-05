require('dotenv').config();

console.log('🔍 Testing environment variables...');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'NOT SET');

// GitHub OAuth variables
console.log('\n🔍 GitHub OAuth variables:');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? '***SET***' : 'NOT SET');
console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? '***SET***' : 'NOT SET');
console.log('GITHUB_REDIRECT_URI:', process.env.GITHUB_REDIRECT_URI || 'NOT SET');
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '***SET***' : 'NOT SET');

// Check for missing required variables
const missingVars = [];
if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD');
if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
if (!process.env.GITHUB_CLIENT_ID) missingVars.push('GITHUB_CLIENT_ID');
if (!process.env.GITHUB_CLIENT_SECRET) missingVars.push('GITHUB_CLIENT_SECRET');
if (!process.env.ENCRYPTION_KEY) missingVars.push('ENCRYPTION_KEY');

if (missingVars.length > 0) {
    console.log('\n❌ Missing required environment variables:', missingVars.join(', '));
    console.log('💡 Please create a .env file in the Backend folder with all required variables');
} else {
    console.log('\n✅ All environment variables loaded successfully');
}







