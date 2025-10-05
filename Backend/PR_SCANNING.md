# 🔍 PR Scanning Feature Documentation

## Overview

The PR Scanning feature allows you to perform security analysis on Pull Requests, focusing only on changed files rather than scanning entire repositories. This provides faster, more targeted security analysis with before/after comparisons.

## 🏗️ Architecture

### Database Schema

```sql
-- Core PR tables
pull_requests          -- GitHub PR metadata
pr_scan_jobs          -- PR scan execution jobs  
pr_scan_results       -- File-level scan results
pr_security_summary    -- Aggregated security metrics
github_webhooks       -- Webhook configuration
```

### Key Components

1. **PR Scanning Service** (`services/prScanningService.js`)
   - GitHub API integration
   - PR diff analysis
   - Security impact calculation
   - Webhook processing

2. **Enhanced AI Analysis** (`lib/ai.js`)
   - `analyzePRCode()` - Diff-aware vulnerability detection
   - Identifies: new vulnerabilities, fixed vulnerabilities, unchanged vulnerabilities
   - Security impact scoring

3. **API Routes** (`routes/pr-scanning.js`)
   - RESTful endpoints for PR management
   - Webhook handling
   - Scan orchestration

## 🚀 Getting Started

### 1. Database Setup

```bash
cd Backend
node scripts/apply-pr-schema.js
```

### 2. Test Backend

```bash
node scripts/test-pr-scanning.js
```

### 3. Start Server

```bash
npm start
```

## 📡 API Endpoints

### PR Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pr/repositories/:repoId/pull-requests` | List PRs for repository |
| `GET` | `/api/pr/pull-requests/:prId` | Get specific PR details |
| `POST` | `/api/pr/repositories/:repoId/sync-prs` | Sync PRs from GitHub |

### PR Scanning

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pr/pull-requests/:prId/scan` | Start PR security scan |
| `GET` | `/api/pr/pr-scans/:prScanJobId` | Get scan results |
| `GET` | `/api/pr/pull-requests/:prId/security-summary` | Get security summary |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pr/webhooks/github` | GitHub webhook handler |

## 🔄 PR Scanning Flow

### 1. Manual Scan Flow

```
User clicks "Scan PR" 
    ↓
POST /api/pr/pull-requests/:prId/scan
    ↓
Create pr_scan_job record
    ↓
Fetch PR files from GitHub API
    ↓
For each changed file:
    - Get file content
    - Analyze with AI (diff-aware)
    - Store results
    ↓
Calculate security summary
    ↓
Update scan status to 'completed'
```

### 2. Webhook Auto-Scan Flow

```
GitHub PR event (opened/updated)
    ↓
POST /api/pr/webhooks/github
    ↓
Update/create PR record
    ↓
Auto-trigger scan if configured
    ↓
Same as manual scan flow
```

## 🤖 AI Analysis Features

### Diff-Aware Analysis

The enhanced AI analysis (`analyzePRCode`) provides:

- **New Vulnerabilities**: Security issues introduced by the PR
- **Fixed Vulnerabilities**: Security issues resolved by the PR  
- **Unchanged Vulnerabilities**: Existing issues that remain
- **Security Impact**: Overall security score change
- **Recommendation**: approve/review/block

### Example AI Response

```json
{
  "vulnerabilitiesAdded": [
    {
      "title": "SQL Injection in User Search",
      "description": "New user search endpoint uses string concatenation...",
      "severity": "critical",
      "line": "45-47",
      "category": "injection",
      "cweId": "CWE-89",
      "owaspCategory": "A03:2021 – Injection"
    }
  ],
  "vulnerabilitiesFixed": [
    {
      "title": "Fixed Hardcoded Password",
      "description": "Removed hardcoded admin password...",
      "severity": "high",
      "line": "12",
      "category": "authentication"
    }
  ],
  "securityImpact": {
    "overall": "improved",
    "newCriticalIssues": 1,
    "newHighIssues": 0,
    "fixedCriticalIssues": 0,
    "fixedHighIssues": 1,
    "recommendation": "review"
  }
}
```

## 📊 Security Summary

### Metrics Calculated

- **Total vulnerabilities added/fixed/unchanged**
- **Critical/High/Medium/Low counts**
- **Security score before/after** (0-100 scale)
- **Recommendation** (approve/review/block)

### Recommendation Logic

```javascript
if (criticalAdded > 0 || highAdded > 2) {
    recommendation = 'block';
} else if (highAdded > 0 || totalAdded > 5) {
    recommendation = 'review';
} else {
    recommendation = 'approve';
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI analysis
GEMINI_API_KEY=your_gemini_key

# GitHub OAuth (existing)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=your_redirect_uri

# Webhook secret (optional)
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### GitHub Webhook Setup

1. Go to repository Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/pr/webhooks/github`
3. Select events: `Pull requests`
4. Set content type: `application/json`

## 🧪 Testing

### Test Database Schema

```bash
node scripts/test-pr-scanning.js
```

### Test API Endpoints

```bash
# List PRs
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/pr/repositories/1/pull-requests

# Start scan
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scanType": "pr_diff"}' \
  http://localhost:4000/api/pr/pull-requests/1/scan

# Get results
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/pr/pr-scans/1
```

## 🚨 Error Handling

### Common Issues

1. **Missing Tables**: Run `node scripts/apply-pr-schema.js`
2. **GitHub API Rate Limits**: Implement exponential backoff
3. **AI Analysis Failures**: Check `GEMINI_API_KEY`
4. **Webhook Verification**: Implement signature validation

### Error Responses

```json
{
  "error": "Pull request not found",
  "code": "PR_NOT_FOUND",
  "details": "PR ID 123 does not exist or access denied"
}
```

## 🔮 Future Enhancements

### Planned Features

1. **PR Comments**: Auto-comment scan results on GitHub PRs
2. **Status Checks**: GitHub status checks for scan results
3. **Branch Protection**: Block merges based on scan results
4. **Team Notifications**: Slack/email alerts for critical issues
5. **Historical Analysis**: Track security trends over time

### Advanced Scanning

1. **Dependency Analysis**: Check for vulnerable dependencies
2. **Secrets Detection**: Scan for exposed API keys/tokens
3. **License Compliance**: Check for problematic licenses
4. **Performance Impact**: Analyze performance implications

## 📈 Performance Considerations

### Optimization Strategies

1. **File Filtering**: Only scan supported file types
2. **Batch Processing**: Process multiple files in parallel
3. **Caching**: Cache GitHub API responses
4. **Rate Limiting**: Respect GitHub API limits
5. **Background Jobs**: Use queue system for large scans

### Monitoring

- Scan duration tracking
- API rate limit monitoring  
- Error rate tracking
- Performance metrics

## 🛠️ Development

### Adding New Scan Types

1. Add scan type to `pr_scan_jobs.scan_type`
2. Implement logic in `performPRScan()`
3. Update AI prompts if needed
4. Add tests

### Extending AI Analysis

1. Modify prompts in `lib/ai.js`
2. Update response validation
3. Add new vulnerability categories
4. Enhance security scoring

---

## 📞 Support

For issues or questions about PR scanning:

1. Check the logs: `Backend/logs/`
2. Run tests: `node scripts/test-pr-scanning.js`
3. Verify database: Check table existence
4. Test GitHub integration: Verify tokens and permissions

**Happy Scanning! 🔍✨**
