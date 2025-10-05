const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyze code for security vulnerabilities using Google Gemini AI
 * @param {string} code - The code to analyze
 * @param {string} filename - The filename (optional)
 * @returns {Promise<Object>} Analysis results with vulnerabilities and fixes
 */
async function analyzeCode(code, filename = 'code.js') {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `
You are an expert application security auditor and code reviewer.
Analyze the following code from a security perspective. Focus on:
- Business logic flaws
- API vulnerabilities
- Broken authentication / authorization
- Injection or input validation issues
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure direct object references
- Security misconfiguration
- Sensitive data exposure

Respond ONLY with valid JSON (no surrounding text, no markdown code blocks) with the shape:
{
  "vulnerabilities": [
    {
      "title": "Short descriptive title",
      "description": "Detailed explanation of the issue and where it is in the code (line/context).",
      "severity": "Critical|High|Medium|Low",
      "line": "line number or range",
      "startingLine": "line number",
      "endingLine": "line number",
      "category": "injection|authentication|xss|csrf|eval|etc",
      "cweId": "CWE-XXX",
      "owaspCategory": "A01:2021 – Broken Access Control",
      "confidenceScore": 0.8
    }
  ],
  "fixes": [
    {
      "line": "line number or range",
      "suggestion": "Detailed fix suggestion with code examples and explanation of why this fix works."
    }
  ]
}

Here is the file: 
\`\`\`javascript
${code}
\`\`\`

Make results concise and focused. Only include real security issues, not style or best practice suggestions.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up the response - remove markdown code blocks if present
        if (text.includes('```json')) {
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        if (text.includes('```')) {
            text = text.replace(/```\n?/g, '');
        }

        // Parse the JSON response
        const analysis = JSON.parse(text);

        // Validate the response structure
        if (!analysis.vulnerabilities || !Array.isArray(analysis.vulnerabilities)) {
            throw new Error('Invalid AI response: missing vulnerabilities array');
        }

        if (!analysis.fixes || !Array.isArray(analysis.fixes)) {
            analysis.fixes = [];
        }

        return analysis;

    } catch (error) {
        console.error('AI analysis error:', error);
        
        // If it's a quota error or model not found, return a mock analysis
        if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('404') || error.message.includes('not found')) {
            console.log('⚠️  Gemini API issue (quota/model), using mock analysis');
            return {
                vulnerabilities: [
                    {
                        title: "Mock Security Analysis",
                        description: "AI analysis unavailable due to API quota limits. Please check back later or upgrade your plan.",
                        severity: "Low",
                        line: "1",
                        startingLine: 1,
                        endingLine: 1
                    }
                ],
                fixes: [
                    {
                        line: "1",
                        suggestion: "This is a mock analysis. Upgrade your Gemini API plan for real security analysis."
                    }
                ]
            };
        }
        
        // If it's a JSON parsing error, return a structured error
        if (error.message.includes('JSON')) {
            throw new Error(`AI response parsing failed: ${error.message}`);
        }
        
        // For other errors, re-throw with context
        throw new Error(`AI analysis failed: ${error.message}`);
    }
}

/**
 * Analyze PR diff for security vulnerabilities using Google Gemini AI
 * @param {string} code - The code to analyze
 * @param {string} filename - The filename
 * @param {string} patch - The git patch/diff
 * @returns {Promise<Object>} Analysis results with vulnerabilities and fixes
 */
async function analyzePRCode(code, filename = 'code.js', patch = '') {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `
You are an expert application security auditor analyzing a Pull Request diff.
Analyze the following code changes from a security perspective. Focus on:
- NEW vulnerabilities introduced by the changes
- VULNERABILITIES that were FIXED by the changes
- EXISTING vulnerabilities that remain unchanged

The analysis should be diff-aware and identify:
- Business logic flaws in new code
- API vulnerabilities in modified endpoints
- Authentication/authorization issues
- Injection vulnerabilities (SQL, NoSQL, Command, LDAP, etc.)
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure direct object references
- Security misconfiguration
- Sensitive data exposure
- Cryptographic issues

Respond ONLY with valid JSON (no surrounding text, no markdown code blocks) with the shape:
{
  "vulnerabilitiesAdded": [
    {
      "title": "Short descriptive title of NEW vulnerability",
      "description": "Detailed explanation of the NEW security issue introduced",
      "severity": "Critical|High|Medium|Low",
      "line": "line number or range",
      "startingLine": "line number",
      "endingLine": "line number",
      "category": "injection|authentication|xss|csrf|etc",
      "cweId": "CWE-XXX",
      "owaspCategory": "A01:2021 – Broken Access Control"
    }
  ],
  "vulnerabilitiesFixed": [
    {
      "title": "Short descriptive title of FIXED vulnerability",
      "description": "Detailed explanation of the security issue that was FIXED",
      "severity": "Critical|High|Medium|Low",
      "line": "line number or range",
      "startingLine": "line number",
      "endingLine": "line number",
      "category": "injection|authentication|xss|csrf|etc",
      "cweId": "CWE-XXX",
      "owaspCategory": "A01:2021 – Broken Access Control"
    }
  ],
  "vulnerabilitiesUnchanged": [
    {
      "title": "Short descriptive title of EXISTING vulnerability",
      "description": "Detailed explanation of the security issue that REMAINS",
      "severity": "Critical|High|Medium|Low",
      "line": "line number or range",
      "startingLine": "line number",
      "endingLine": "line number",
      "category": "injection|authentication|xss|csrf|etc",
      "cweId": "CWE-XXX",
      "owaspCategory": "A01:2021 – Broken Access Control"
    }
  ],
  "fixes": [
    {
      "line": "line number or range",
      "suggestion": "Detailed fix suggestion with code examples and explanation of why this fix works."
    }
  ],
  "securityImpact": {
    "overall": "improved|degraded|neutral",
    "newCriticalIssues": 0,
    "newHighIssues": 0,
    "fixedCriticalIssues": 0,
    "fixedHighIssues": 0,
    "recommendation": "approve|review|block"
  }
}

Here is the file content:
\`\`\`javascript
${code}
\`\`\`

Here is the git patch showing the changes:
\`\`\`diff
${patch}
\`\`\`

Make results concise and focused. Only include real security issues, not style or best practice suggestions.
Be specific about what changed and what the security impact is.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up the response - remove markdown code blocks if present
        if (text.includes('```json')) {
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        if (text.includes('```')) {
            text = text.replace(/```\n?/g, '');
        }

        // Parse the JSON response
        const analysis = JSON.parse(text);

        // Validate the response structure
        if (!analysis.vulnerabilitiesAdded || !Array.isArray(analysis.vulnerabilitiesAdded)) {
            analysis.vulnerabilitiesAdded = [];
        }
        if (!analysis.vulnerabilitiesFixed || !Array.isArray(analysis.vulnerabilitiesFixed)) {
            analysis.vulnerabilitiesFixed = [];
        }
        if (!analysis.vulnerabilitiesUnchanged || !Array.isArray(analysis.vulnerabilitiesUnchanged)) {
            analysis.vulnerabilitiesUnchanged = [];
        }
        if (!analysis.fixes || !Array.isArray(analysis.fixes)) {
            analysis.fixes = [];
        }
        if (!analysis.securityImpact) {
            analysis.securityImpact = {
                overall: 'neutral',
                newCriticalIssues: 0,
                newHighIssues: 0,
                fixedCriticalIssues: 0,
                fixedHighIssues: 0,
                recommendation: 'review'
            };
        }

        return analysis;

    } catch (error) {
        console.error('AI PR analysis error:', error);
        
        // If it's a quota error or model not found, return a mock analysis
        if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('404') || error.message.includes('not found')) {
            console.log('⚠️  Gemini API issue (quota/model), using mock PR analysis');
            return {
                vulnerabilitiesAdded: [
                    {
                        title: "Mock PR Security Analysis",
                        description: "AI analysis unavailable due to API quota limits. Please check back later or upgrade your plan.",
                        severity: "Low",
                        line: "1",
                        startingLine: 1,
                        endingLine: 1,
                        category: "general",
                        cweId: "N/A",
                        owaspCategory: "N/A"
                    }
                ],
                vulnerabilitiesFixed: [],
                vulnerabilitiesUnchanged: [],
                fixes: [
                    {
                        line: "1",
                        suggestion: "This is a mock analysis. Upgrade your Gemini API plan for real security analysis."
                    }
                ],
                securityImpact: {
                    overall: "neutral",
                    newCriticalIssues: 0,
                    newHighIssues: 0,
                    fixedCriticalIssues: 0,
                    fixedHighIssues: 0,
                    recommendation: "review"
                }
            };
        }
        
        // If it's a JSON parsing error, return a structured error
        if (error.message.includes('JSON')) {
            throw new Error(`AI PR response parsing failed: ${error.message}`);
        }
        
        // For other errors, re-throw with context
        throw new Error(`AI PR analysis failed: ${error.message}`);
    }
}

module.exports = {
    analyzeCode,
    analyzePRCode
};

