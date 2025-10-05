const pool = require('../config/database');
const repositoryWatchService = require('./repositoryWatchService');
const prScanningService = require('./prScanningService');
const githubService = require('./githubService');

class PRMonitoringService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.pollingInterval = 60000; // 1 minute
        this.lastCheckedPRs = new Map(); // Store last checked PR ID per repository
    }

    // Start monitoring for new PRs
    start() {
        if (this.isRunning) {
            console.log('PR monitoring service is already running');
            return;
        }

        console.log('Starting PR monitoring service...');
        this.isRunning = true;
        
        // Check immediately
        this.checkForNewPRs();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.checkForNewPRs();
        }, this.pollingInterval);

        console.log(`PR monitoring service started (checking every ${this.pollingInterval / 1000} seconds)`);
    }

    // Stop monitoring
    stop() {
        if (!this.isRunning) {
            console.log('PR monitoring service is not running');
            return;
        }

        console.log('Stopping PR monitoring service...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('PR monitoring service stopped');
    }

    // Check for new PRs in all watched repositories
    async checkForNewPRs() {
        try {
            console.log('🔍 Checking for new PRs in watched repositories...');
            
            // Get all active watches
            const watches = await repositoryWatchService.getAllActiveWatches();
            
            if (watches.length === 0) {
                console.log('No active repository watches found');
                return;
            }

            console.log(`Found ${watches.length} active watches`);

            // Group watches by repository
            const watchesByRepo = {};
            for (const watch of watches) {
                if (!watchesByRepo[watch.repository_id]) {
                    watchesByRepo[watch.repository_id] = [];
                }
                watchesByRepo[watch.repository_id].push(watch);
            }

            // Check each repository
            for (const [repoId, repoWatches] of Object.entries(watchesByRepo)) {
                try {
                    await this.checkRepositoryForNewPRs(parseInt(repoId), repoWatches);
                } catch (error) {
                    console.error(`Error checking repository ${repoId}:`, error.message);
                }
            }

        } catch (error) {
            console.error('Error checking for new PRs:', error);
        }
    }

    // Check a specific repository for new PRs
    async checkRepositoryForNewPRs(repoId, watches) {
        try {
            // Get repository info
            const repoQuery = 'SELECT * FROM repositories WHERE id = $1';
            const repoResult = await pool.query(repoQuery, [repoId]);
            
            if (repoResult.rows.length === 0) {
                console.log(`Repository ${repoId} not found`);
                return;
            }

            const repository = repoResult.rows[0];
            console.log(`Checking repository: ${repository.full_name}`);

            // Get access token for this repository
            // First, get the GitHub account for this repository
            const githubAccountQuery = 'SELECT * FROM github_accounts WHERE id = $1';
            const githubAccountResult = await pool.query(githubAccountQuery, [repository.github_account_id]);
            
            if (githubAccountResult.rows.length === 0) {
                console.log(`No GitHub account found for repository ${repository.full_name}`);
                return;
            }

            const githubAccount = githubAccountResult.rows[0];
            const token = await githubService.getAccessToken(githubAccount.user_id);
            if (!token) {
                console.log(`No access token found for repository ${repository.full_name}`);
                return;
            }

            // Fetch recent PRs from GitHub
            const prs = await this.fetchRecentPRs(repository.full_name, token);
            
            if (!prs || prs.length === 0) {
                console.log(`No PRs found for ${repository.full_name}`);
                return;
            }

            // Get the last checked PR ID for this repository
            const lastCheckedId = this.lastCheckedPRs.get(repoId) || 0;
            let newPRs = [];

            // Find new PRs (PRs with ID greater than last checked)
            for (const pr of prs) {
                if (pr.number > lastCheckedId) {
                    newPRs.push(pr);
                }
            }

            if (newPRs.length === 0) {
                console.log(`No new PRs found for ${repository.full_name}`);
                return;
            }

            console.log(`Found ${newPRs.length} new PRs in ${repository.full_name}`);

            // Update last checked ID
            const maxPRId = Math.max(...prs.map(pr => pr.number));
            this.lastCheckedPRs.set(repoId, maxPRId);

            // Process each new PR
            for (const pr of newPRs) {
                await this.processNewPR(pr, repository, watches, githubAccount);
            }

        } catch (error) {
            console.error(`Error checking repository ${repoId} for new PRs:`, error);
        }
    }

    // Fetch recent PRs from GitHub
    async fetchRecentPRs(fullName, token) {
        try {
            // Build query string for parameters
            const params = new URLSearchParams({
                state: 'open',
                sort: 'created',
                direction: 'desc',
                per_page: '10'
            });
            
            const endpoint = `/repos/${fullName}/pulls?${params.toString()}`;
            const response = await githubService.makeGitHubRequest(token, endpoint);

            return response.data || [];
        } catch (error) {
            console.error(`Error fetching PRs for ${fullName}:`, error.message);
            return [];
        }
    }

    // Process a new PR
    async processNewPR(pr, repository, watches, githubAccount) {
        try {
            console.log(`📝 Processing new PR #${pr.number}: ${pr.title} in ${repository.full_name}`);

            // Store PR in database if not exists
            await this.storePR(pr, repository);

            // Process for each watch
            for (const watch of watches) {
                if (watch.scan_on_open && watch.email_notifications) {
                    // Queue PR opened notification
                    await repositoryWatchService.handlePROpened(pr, repository.id);

                    // Start automatic scan if enabled
                    if (watch.scan_on_open) {
                        try {
                            // Get the stored PR ID
                            const prQuery = 'SELECT id FROM pull_requests WHERE github_pr_id = $1 AND repository_id = $2';
                            const prResult = await pool.query(prQuery, [pr.number, repository.id]);
                            
                            if (prResult.rows.length > 0) {
                                const prId = prResult.rows[0].id;
                                const scanResult = await prScanningService.startPRScan(
                                    githubAccount.user_id, // Use the GitHub account's user_id
                                    prId,
                                    { scanType: 'pr_diff' }
                                );
                                
                                console.log(`🚀 Auto-scan started for PR #${pr.number}:`, scanResult);
                            }
                        } catch (scanError) {
                            console.error(`Failed to start auto-scan for PR #${pr.number}:`, scanError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error(`Error processing PR #${pr.number}:`, error);
        }
    }

    // Store PR in database
    async storePR(pr, repository) {
        try {
            const query = `
                INSERT INTO pull_requests 
                (github_pr_id, repository_id, title, description, author_username, author_avatar_url, 
                 base_branch, head_branch, status, created_at, updated_at, html_url, base_commit_sha, head_commit_sha)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (github_pr_id, repository_id) 
                DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    author_username = EXCLUDED.author_username,
                    author_avatar_url = EXCLUDED.author_avatar_url,
                    base_branch = EXCLUDED.base_branch,
                    head_branch = EXCLUDED.head_branch,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at,
                    html_url = EXCLUDED.html_url,
                    base_commit_sha = EXCLUDED.base_commit_sha,
                    head_commit_sha = EXCLUDED.head_commit_sha
            `;

            await pool.query(query, [
                pr.number,
                repository.id,
                pr.title,
                pr.body || '',
                pr.user?.login || 'Unknown',
                pr.user?.avatar_url || '',
                pr.base?.ref || 'main',
                pr.head?.ref || 'main',
                pr.state === 'open' ? 'open' : 'closed',
                new Date(pr.created_at),
                new Date(pr.updated_at),
                pr.html_url,
                pr.base?.sha || null, // base commit SHA
                pr.head?.sha || null  // head commit SHA
            ]);

        } catch (error) {
            console.error('Error storing PR:', error);
        }
    }

    // Get monitoring status
    getStatus() {
        return {
            isRunning: this.isRunning,
            pollingInterval: this.pollingInterval,
            nextCheckTime: this.isRunning ? new Date(Date.now() + this.pollingInterval) : null,
            watchedRepositories: this.lastCheckedPRs.size
        };
    }

    // Update polling interval
    setInterval(interval) {
        this.pollingInterval = interval;
        
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
}

// Create singleton instance
const prMonitoringService = new PRMonitoringService();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down PR monitoring service...');
    prMonitoringService.stop();
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down PR monitoring service...');
    prMonitoringService.stop();
});

module.exports = prMonitoringService;
