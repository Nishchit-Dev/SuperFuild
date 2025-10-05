require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./config/database');
const DatabaseInitializer = require('./lib/database-init');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const githubRoutes = require('./routes/github');
const prScanningRoutes = require('./routes/pr-scanning');
const repositoryWatchingRoutes = require('./routes/repository-watching');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/pr', prScanningRoutes);
app.use('/api/watching', repositoryWatchingRoutes);


/**
 * Prompt template generator
 * Keep prompt explicit so AI returns reliable JSON.
 */
function makePrompt(code, filename = "code.js") {
  return `
You are an expert application security auditor and code reviewer.
Analyze the following code from a security perspective. Focus on:
- Business logic flaws
- API vulnerabilities
- Broken authentication / authorization
- Injection or input validation issues

Respond ONLY with valid JSON (no surrounding text) with the shape:
{
  "vulnerabilities": [
    {
      "title": "Short title",
      "description": "Explain the issue and where it is in the code (line/context).",
      "severity": "High|Medium|Low",
      "location": { "filename": "${filename}", "snippet": "..." }
    }
  ],
  "fixes": [
    {
      "original_code": "...",
      "patched_code": "...",
      "explanation": "Why this fix works and risk tradeoffs."
    }
  ]
}

Here is the file: 
\`\`\`javascript
${code}
\`\`\`

Make results concise and focused.
`;
}

/**
 * /scan endpoint
 * Body: { code: string, filename?: string }
 */
app.post('/api/scan', async (req, res) => {
    try {
        const { code, filename = 'code.js' } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        // Use the AI service to analyze code
        const { analyzeCode } = require('./lib/ai');
        const result = await analyzeCode(code, filename);
        
        res.json(result);
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to analyze code' });
    }
});

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        const dbInit = new DatabaseInitializer();
        const dbReady = await dbInit.initialize();
        
        if (!dbReady) {
            console.error('❌ Failed to initialize database. Server will not start.');
            process.exit(1);
        }
        
        // Clean up database initialization connections
        await dbInit.cleanup();
        
        // Start email processor
        const emailProcessor = require('./services/emailProcessor');
        emailProcessor.start();

        // Start PR monitoring service
        const prMonitoringService = require('./services/prMonitoringService');
        prMonitoringService.start();

        // Start the server
        const port = process.env.PORT || 4000;
        app.listen(port, () => {
            console.log(`🚀 AISecure backend listening on port ${port}`);
            console.log(`📊 Database: aisecure_auth`);
            console.log(`📧 Email processor: Started`);
            console.log(`👀 PR monitoring: Started`);
            console.log(`🔗 API endpoints:`);
            console.log(`   - Auth: http://localhost:${port}/api/auth`);
            console.log(`   - GitHub: http://localhost:${port}/api/github`);
            console.log(`   - PR Scanning: http://localhost:${port}/api/pr`);
            console.log(`   - Repository Watching: http://localhost:${port}/api/watching`);
            console.log(`   - Scan: http://localhost:${port}/api/scan`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start the server
startServer();
