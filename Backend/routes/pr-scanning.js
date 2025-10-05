const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const prScanningService = require('../services/prScanningService');
const githubService = require('../services/githubService');

// Get PRs for a repository
router.get('/repositories/:repoId/pull-requests', authenticateToken, async (req, res) => {
    try {
        const { repoId } = req.params;
        const { page = 1, limit = 20, status = 'open' } = req.query;
        
        const prs = await prScanningService.getPullRequests(req.user.id, repoId, {
            page: parseInt(page),
            limit: parseInt(limit),
            status
        });
        
        res.json(prs);
    } catch (error) {
        console.error('Get PRs error:', error);
        res.status(500).json({ error: 'Failed to get pull requests' });
    }
});

// Get specific PR details
router.get('/pull-requests/:prId', authenticateToken, async (req, res) => {
    try {
        const { prId } = req.params;
        
        const pr = await prScanningService.getPullRequestDetails(req.user.id, prId);
        
        if (!pr) {
            return res.status(404).json({ error: 'Pull request not found' });
        }
        
        res.json(pr);
    } catch (error) {
        console.error('Get PR details error:', error);
        res.status(500).json({ error: 'Failed to get pull request details' });
    }
});

// Start PR scan
router.post('/pull-requests/:prId/scan', authenticateToken, async (req, res) => {
    try {
        const { prId } = req.params;
        const { scanType = 'pr_diff' } = req.body;
        
        const result = await prScanningService.startPRScan(req.user.id, prId, {
            scanType
        });
        
        res.json({
            message: 'PR scan started successfully',
            prScanJobId: result.prScanJobId,
            status: result.status
        });
    } catch (error) {
        console.error('Start PR scan error:', error);
        res.status(500).json({ error: 'Failed to start PR scan' });
    }
});

// Get PR scan results
router.get('/pr-scans/:prScanJobId', authenticateToken, async (req, res) => {
    try {
        const { prScanJobId } = req.params;
        
        const result = await prScanningService.getPRScanResults(req.user.id, prScanJobId);
        
        if (!result) {
            return res.status(404).json({ error: 'PR scan not found' });
        }
        
        res.json(result);
    } catch (error) {
        console.error('Get PR scan results error:', error);
        res.status(500).json({ error: 'Failed to get PR scan results' });
    }
});

// Get PR security summary
router.get('/pull-requests/:prId/security-summary', authenticateToken, async (req, res) => {
    try {
        const { prId } = req.params;
        
        const summary = await prScanningService.getPRSecuritySummary(req.user.id, prId);
        
        res.json(summary);
    } catch (error) {
        console.error('Get PR security summary error:', error);
        res.status(500).json({ error: 'Failed to get security summary' });
    }
});

// Sync PRs from GitHub
router.post('/repositories/:repoId/sync-prs', authenticateToken, async (req, res) => {
    try {
        const { repoId } = req.params;
        
        const result = await prScanningService.syncPullRequests(req.user.id, repoId);
        
        res.json({
            message: 'PRs synced successfully',
            prsAdded: result.prsAdded,
            prsUpdated: result.prsUpdated
        });
    } catch (error) {
        console.error('Sync PRs error:', error);
        res.status(500).json({ error: 'Failed to sync pull requests' });
    }
});

// Get file content for PR scan results
router.get('/pr-scans/:prScanJobId/file', authenticateToken, async (req, res) => {
    try {
        const { prScanJobId } = req.params;
        const { path, branch } = req.query;

        if (!path) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const pool = require('../config/database');
        
        // Find PR scan job and repository info
        const infoQuery = `
            SELECT psj.head_commit_sha, r.full_name AS repo_full_name, r.name AS repo_name, pr.head_branch
            FROM pr_scan_jobs psj
            JOIN repositories r ON psj.repository_id = r.id
            JOIN pull_requests pr ON psj.pull_request_id = pr.id
            WHERE psj.id = $1 AND psj.user_id = $2
        `;
        const infoResult = await pool.query(infoQuery, [prScanJobId, req.user.id]);
        if (infoResult.rows.length === 0) {
            return res.status(404).json({ error: 'PR scan job not found' });
        }
        
        const { head_commit_sha, repo_full_name, repo_name, head_branch } = infoResult.rows[0];
        const owner_username = (repo_full_name || '').split('/')[0];

        // Get decrypted access token for this user
        const accessToken = await githubService.getAccessToken(req.user.id);

        // Fetch content from GitHub using the PR branch
        const fileData = await githubService.getFileContent(
            accessToken,
            owner_username,
            repo_name,
            String(path),
            branch || head_branch || 'main'
        );

        res.json({
            path: fileData.path || String(path),
            content: fileData.content,
            encoding: fileData.encoding || 'utf-8',
            sha: fileData.sha || head_commit_sha || null,
        });
    } catch (error) {
        console.error('Get file content for PR scan error:', error);
        res.status(500).json({ error: 'Failed to get file content' });
    }
});

// GitHub Webhook endpoint for PR events
router.post('/webhooks/github', async (req, res) => {
    try {
        const { action, pull_request, repository } = req.body;
        
        if (!['opened', 'synchronize', 'closed'].includes(action)) {
            return res.status(200).json({ message: 'Event not relevant for security scanning' });
        }
        
        // Process webhook
        await prScanningService.processPRWebhook(req.body);
        
        res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        console.error('GitHub webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

module.exports = router;


