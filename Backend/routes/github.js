const express = require('express');
const router = express.Router();
const githubService = require('../services/githubService');
const repositoryScanner = require('../services/repositoryScanner');
const { authenticateToken } = require('../middleware/auth');

// GitHub OAuth routes
router.get('/auth', (req, res) => {
    try {
        const state = req.query.state || 'default';
        const authUrl = githubService.generateAuthURL(state);
        res.redirect(authUrl);
    } catch (error) {
        console.error('GitHub auth error:', error);
        res.status(500).json({ error: 'Failed to initiate GitHub authentication' });
    }
});

// GET callback for GitHub OAuth redirect
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }

        // Exchange code for token
        const tokenData = await githubService.exchangeCodeForToken(code);
        
        if (!tokenData.access_token) {
            return res.status(400).json({ error: 'Failed to get access token' });
        }

        // Get user info
        const userInfo = await githubService.getUserInfo(tokenData.access_token);
        
        // Store GitHub account (you'll need to get userId from session/token)
        // For now, we'll redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/github/callback?code=${code}&state=${state}`);
        
    } catch (error) {
        console.error('GitHub callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/github/callback?error=${encodeURIComponent(error.message)}`);
    }
});

// POST callback for frontend to backend communication
router.post('/callback', authenticateToken, async (req, res) => {
    try {
        const { code, state } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }

        // Exchange code for token
        console.log('GitHub OAuth POST /callback received code. State:', state, 'Redirect URI:', process.env.GITHUB_REDIRECT_URI || 'unset');
        const tokenData = await githubService.exchangeCodeForToken(code);
        
        if (!tokenData.access_token) {
            console.error('GitHub token response missing access_token:', tokenData);
            return res.status(400).json({ error: 'Failed to get access token' });
        }

        // Get user info
        const userInfo = await githubService.getUserInfo(tokenData.access_token);

        // Persist GitHub account for the authenticated user
        const githubAccountId = await githubService.storeGitHubAccount(req.user.id, userInfo, tokenData);

        // Optionally fetch and persist repositories now
        try {
            const repositories = await githubService.getUserRepositories(tokenData.access_token);
            await githubService.storeRepositories(githubAccountId, repositories);
        } catch (repoErr) {
            // Non-fatal: account connected even if repo sync fails
            console.warn('Repository sync during callback failed:', repoErr.message);
        }

        res.json({ 
            message: 'GitHub account connected successfully',
            user: {
                id: userInfo.id,
                login: userInfo.login,
                name: userInfo.name,
                avatar_url: userInfo.avatar_url
            }
        });
        
    } catch (error) {
        console.error('GitHub callback error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GitHub account management
router.get('/account', authenticateToken, async (req, res) => {
    try {
        const account = await githubService.getGitHubAccount(req.user.id);
        
        if (!account) {
            return res.status(404).json({ error: 'GitHub account not connected' });
        }

        res.json({
            id: account.id,
            username: account.username,
            displayName: account.display_name,
            avatarUrl: account.avatar_url,
            connectedAt: account.created_at
        });
    } catch (error) {
        console.error('Get GitHub account error:', error);
        res.status(500).json({ error: 'Failed to get GitHub account' });
    }
});

router.post('/disconnect', authenticateToken, async (req, res) => {
    try {
        // Remove GitHub account from database
        const pool = require('../config/database');
        await pool.query('DELETE FROM github_accounts WHERE user_id = $1', [req.user.id]);
        
        res.json({ message: 'GitHub account disconnected successfully' });
    } catch (error) {
        console.error('Disconnect GitHub account error:', error);
        res.status(500).json({ error: 'Failed to disconnect GitHub account' });
    }
});

// Repository management
router.get('/repositories', authenticateToken, async (req, res) => {
    try {
        const repositories = await githubService.getUserRepositoriesFromDB(req.user.id);
        
        res.json({
            repositories: repositories.map(repo => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                language: repo.language,
                isPrivate: repo.is_private,
                defaultBranch: repo.default_branch,
                htmlUrl: repo.html_url,
                lastUpdated: repo.last_updated,
                ownerUsername: repo.owner_username
            }))
        });
    } catch (error) {
        console.error('Get repositories error:', error);
        res.status(500).json({ error: 'Failed to get repositories' });
    }
});

router.post('/repositories/sync', authenticateToken, async (req, res) => {
    try {
        // Get GitHub account
        const account = await githubService.getGitHubAccount(req.user.id);
        if (!account) {
            return res.status(404).json({ error: 'GitHub account not connected' });
        }

        // Get decrypted access token
        const accessToken = await githubService.getAccessToken(req.user.id);

        // Get fresh repositories from GitHub
        const repositories = await githubService.getUserRepositories(accessToken);
        
        // Store/update repositories in database
        await githubService.storeRepositories(account.id, repositories);
        
        res.json({ 
            message: 'Repositories synced successfully',
            count: repositories.length
        });
    } catch (error) {
        console.error('Sync repositories error:', error);
        res.status(500).json({ error: 'Failed to sync repositories' });
    }
});

// Repository scanning
router.post('/scan', authenticateToken, async (req, res) => {
    try {
        const { repositoryId, scanType = 'full', targetBranch = 'main', filesToScan = [] } = req.body;
        
        if (!repositoryId) {
            return res.status(400).json({ error: 'Repository ID is required' });
        }

        // Start scan
        const result = await repositoryScanner.startScan(req.user.id, repositoryId, {
            scanType,
            targetBranch,
            filesToScan
        });

        res.json({
            message: 'Scan started successfully',
            scanJobId: result.scanJobId,
            status: result.status
        });
    } catch (error) {
        console.error('Start scan error:', error);
        res.status(500).json({ error: 'Failed to start scan' });
    }
});

router.get('/scan/:scanJobId', authenticateToken, async (req, res) => {
    try {
        const { scanJobId } = req.params;
        
        const pool = require('../config/database');
        const query = `
            SELECT sj.*, r.name as repo_name, r.full_name as repo_full_name
            FROM scan_jobs sj
            JOIN repositories r ON sj.repository_id = r.id
            WHERE sj.id = $1 AND sj.user_id = $2
        `;
        
        const result = await pool.query(query, [scanJobId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scan job not found' });
        }

        const scanJob = result.rows[0];
        
        // Get scan results if completed
        let scanResults = [];
        if (scanJob.status === 'completed') {
            const resultsQuery = `
                SELECT 
                    sr.id,
                    sr.scan_job_id,
                    sr.file_path,
                    sr.file_content_hash,
                    sr.vulnerabilities,
                    sr.fixes,
                    sr.ai_analysis_metadata,
                    sr.created_at
                FROM scan_results sr
                WHERE sr.scan_job_id = $1
                ORDER BY sr.file_path
            `;
            
            const results = await pool.query(resultsQuery, [scanJobId]);
            scanResults = results.rows;
        }

        res.json({
            scanJob: {
                id: scanJob.id,
                status: scanJob.status,
                scanType: scanJob.scan_type,
                targetBranch: scanJob.target_branch,
                startedAt: scanJob.started_at,
                completedAt: scanJob.completed_at,
                errorMessage: scanJob.error_message,
                repository: {
                    name: scanJob.repo_name,
                    fullName: scanJob.repo_full_name
                }
            },
            results: scanResults
        });
    } catch (error) {
        console.error('Get scan results error:', error);
        res.status(500).json({ error: 'Failed to get scan results' });
    }
});

// Get raw file content for a scan's repository (used to show code when snippet is missing)
router.get('/scan/:scanJobId/file', authenticateToken, async (req, res) => {
    try {
        const { scanJobId } = req.params;
        const { path, sha } = req.query;

        if (!path) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const pool = require('../config/database');
        // Find scan job and repository info
        const infoQuery = `
            SELECT sj.target_branch, r.full_name AS repo_full_name, r.name AS repo_name
            FROM scan_jobs sj
            JOIN repositories r ON sj.repository_id = r.id
            WHERE sj.id = $1 AND sj.user_id = $2
        `;
        const infoResult = await pool.query(infoQuery, [scanJobId, req.user.id]);
        if (infoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Scan job not found' });
        }
        const { target_branch, repo_full_name, repo_name } = infoResult.rows[0];
        const owner_username = (repo_full_name || '').split('/')[0];

        // Get decrypted access token for this user
        const accessToken = await githubService.getAccessToken(req.user.id);

        // Fetch content from GitHub
        const fileData = await githubService.getFileContent(
            accessToken,
            owner_username,
            repo_name,
            String(path),
            target_branch || 'main',
            sha ? String(sha) : undefined
        );

        res.json({
            path: fileData.path || String(path),
            content: fileData.content,
            encoding: fileData.encoding || 'utf-8',
            sha: fileData.sha || sha || null,
        });
    } catch (error) {
        console.error('Get file content for scan error:', error);
        res.status(500).json({ error: 'Failed to get file content' });
    }
});

router.get('/scans', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        
        const pool = require('../config/database');
        let query = `
            SELECT sj.*, r.name as repo_name, r.full_name as repo_full_name
            FROM scan_jobs sj
            JOIN repositories r ON sj.repository_id = r.id
            WHERE sj.user_id = $1
        `;
        
        const params = [req.user.id];
        
        if (status) {
            query += ' AND sj.status = $2';
            params.push(status);
        }
        
        query += ' ORDER BY sj.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            scans: result.rows.map(scan => ({
                id: scan.id,
                status: scan.status,
                scanType: scan.scan_type,
                targetBranch: scan.target_branch,
                startedAt: scan.started_at,
                completedAt: scan.completed_at,
                errorMessage: scan.error_message,
                repository: {
                    name: scan.repo_name,
                    fullName: scan.repo_full_name
                }
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get scans error:', error);
        res.status(500).json({ error: 'Failed to get scans' });
    }
});

module.exports = router;
