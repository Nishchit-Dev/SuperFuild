const githubService = require('./githubService');
const repositoryScanner = require('./repositoryScanner');
const repositoryWatchService = require('./repositoryWatchService');
const { analyzePRCode } = require('../lib/ai');
const pool = require('../config/database');

class PRScanningService {
    constructor() {
        this.maxPRsPerSync = 100;
        this.supportedFileTypes = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.go', '.rb', '.cs', '.cpp', '.c', '.h', '.hpp'];
    }

    // Get PRs for a repository
    async getPullRequests(userId, repositoryId, options = {}) {
        const { page = 1, limit = 20, status = 'open' } = options;
        const offset = (page - 1) * limit;

        const query = `
            SELECT pr.*, 
                   COUNT(psj.id) as scan_count,
                   MAX(psj.completed_at) as last_scan_at
            FROM pull_requests pr
            LEFT JOIN pr_scan_jobs psj ON pr.id = psj.pull_request_id
            WHERE pr.repository_id = $1 AND pr.status = $2
            GROUP BY pr.id
            ORDER BY pr.created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await pool.query(query, [repositoryId, status, limit, offset]);
        
        return {
            prs: result.rows,
            pagination: {
                page,
                limit,
                total: result.rows.length
            }
        };
    }

    // Get specific PR details
    async getPullRequestDetails(userId, prId) {
        const query = `
            SELECT pr.*, r.name as repo_name, r.full_name as repo_full_name
            FROM pull_requests pr
            JOIN repositories r ON pr.repository_id = r.id
            JOIN github_accounts ga ON r.github_account_id = ga.id
            WHERE pr.id = $1 AND ga.user_id = $2
        `;

        const result = await pool.query(query, [prId, userId]);
        return result.rows[0] || null;
    }

    // Start PR scan
    async startPRScan(userId, prId, options = {}) {
        try {
            const { scanType = 'pr_diff' } = options;

            // Get PR details
            const pr = await this.getPullRequestDetails(userId, prId);
            if (!pr) {
                throw new Error('Pull request not found');
            }

            // Get repository info
            const repoInfo = await repositoryScanner.getRepositoryInfo(pr.repository_id, userId);
            if (!repoInfo) {
                throw new Error('Repository access denied');
            }

            // Get PR files changed
            const changedFiles = await this.getPRChangedFiles(repoInfo.accessToken, repoInfo.username, repoInfo.repoName, pr.github_pr_id);

            // Create PR scan job
            const prScanJobId = await this.createPRScanJob(userId, pr.repository_id, prId, {
                scanType,
                baseCommit: pr.base_commit_sha,
                headCommit: pr.head_commit_sha,
                changedFiles
            });

            // Start scanning in background
            this.performPRScan(prScanJobId, pr, repoInfo, changedFiles, options).catch(error => {
                console.error('PR scan error:', error);
                this.updatePRScanJobStatus(prScanJobId, 'failed', error.message);
            });

            return { prScanJobId, status: 'started' };
        } catch (error) {
            console.error('Start PR scan error:', error);
            throw error;
        }
    }

    // Get PR changed files from GitHub API
    async getPRChangedFiles(accessToken, username, repoName, prNumber) {
        try {
            const response = await githubService.makeGitHubRequest(
                accessToken,
                `/repos/${username}/${repoName}/pulls/${prNumber}/files`
            );

            return response.data.map(file => ({
                path: file.filename,
                status: file.status, // added, modified, deleted, renamed
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                patch: file.patch
            }));
        } catch (error) {
            console.error('Get PR files error:', error);
            throw new Error('Failed to get PR changed files');
        }
    }

    // Perform PR scan
    async performPRScan(prScanJobId, pr, repoInfo, changedFiles, options) {
        try {
            await this.updatePRScanJobStatus(prScanJobId, 'running');

            const { accessToken, username, repoName } = repoInfo;
            const scanResults = [];

            // Process only changed files
            for (const file of changedFiles) {
                if (file.status === 'deleted') continue;

                try {
                    // Get file content from PR branch
                    const fileContent = await githubService.getFileContent(
                        accessToken, 
                        username, 
                        repoName, 
                        file.path, 
                        pr.head_branch
                    );

                    // Analyze with AI
                    const analysis = await this.analyzePRFile(fileContent.content, file.path, file.patch);
                    
                    scanResults.push({
                        filePath: file.path,
                        changeType: file.status,
                        vulnerabilitiesAdded: analysis.vulnerabilitiesAdded || [],
                        vulnerabilitiesFixed: analysis.vulnerabilitiesFixed || [],
                        vulnerabilitiesUnchanged: analysis.vulnerabilitiesUnchanged || [],
                        aiAnalysisMetadata: {
                            model: 'gemini-1.5-flash',
                            timestamp: new Date().toISOString(),
                            patchAnalysis: true
                        }
                    });
                } catch (error) {
                    console.error(`Error scanning PR file ${file.path}:`, error.message);
                }
            }

            // Store PR scan results
            await this.storePRScanResults(prScanJobId, scanResults);

            // Calculate security summary
            await this.calculatePRSecuritySummary(prScanJobId, scanResults);

            await this.updatePRScanJobStatus(prScanJobId, 'completed');
            
            console.log(`PR scan completed for PR #${pr.github_pr_id}: ${scanResults.length} files analyzed`);

            // Notify repository watch service about scan completion
            try {
                await repositoryWatchService.handleScanCompleted(prScanJobId, scanResults);
            } catch (notifyError) {
                console.error('Failed to notify scan completion:', notifyError);
            }

        } catch (error) {
            console.error('Perform PR scan error:', error);
            await this.updatePRScanJobStatus(prScanJobId, 'failed', error.message);
            throw error;
        }
    }

    // Analyze PR file with patch context
    async analyzePRFile(fileContent, filePath, patch) {
        try {
            // Use the new PR-specific AI analysis
            const analysis = await analyzePRCode(fileContent, filePath, patch);
            
            return {
                vulnerabilitiesAdded: analysis.vulnerabilitiesAdded || [],
                vulnerabilitiesFixed: analysis.vulnerabilitiesFixed || [],
                vulnerabilitiesUnchanged: analysis.vulnerabilitiesUnchanged || [],
                fixes: analysis.fixes || [],
                securityImpact: analysis.securityImpact || {
                    overall: 'neutral',
                    newCriticalIssues: 0,
                    newHighIssues: 0,
                    fixedCriticalIssues: 0,
                    fixedHighIssues: 0,
                    recommendation: 'review'
                }
            };
        } catch (error) {
            console.error(`Error analyzing PR file ${filePath}:`, error);
            return {
                vulnerabilitiesAdded: [],
                vulnerabilitiesFixed: [],
                vulnerabilitiesUnchanged: [],
                fixes: [],
                securityImpact: {
                    overall: 'neutral',
                    newCriticalIssues: 0,
                    newHighIssues: 0,
                    fixedCriticalIssues: 0,
                    fixedHighIssues: 0,
                    recommendation: 'review'
                }
            };
        }
    }

    // Database operations
    async createPRScanJob(userId, repositoryId, prId, options) {
        // Get the GitHub PR ID from the pull_requests table
        const prQuery = `SELECT github_pr_id FROM pull_requests WHERE id = $1`;
        const prResult = await pool.query(prQuery, [prId]);
        
        if (prResult.rows.length === 0) {
            throw new Error('Pull request not found');
        }
        
        const githubPrId = prResult.rows[0].github_pr_id;
        
        const query = `
            INSERT INTO pr_scan_jobs (user_id, repository_id, pull_request_id, github_pr_id, scan_type, base_commit_sha, head_commit_sha, files_changed, started_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;
        
        const result = await pool.query(query, [
            userId,
            repositoryId,
            prId,
            githubPrId,
            options.scanType,
            options.baseCommit,
            options.headCommit,
            options.changedFiles.map(f => f.path),
            new Date()
        ]);
        
        return result.rows[0].id;
    }

    async updatePRScanJobStatus(prScanJobId, status, errorMessage = null) {
        const query = `
            UPDATE pr_scan_jobs 
            SET status = $1, error_message = $2, completed_at = $3
            WHERE id = $4
        `;
        
        await pool.query(query, [
            status,
            errorMessage,
            status === 'completed' || status === 'failed' ? new Date() : null,
            prScanJobId
        ]);
    }

    async storePRScanResults(prScanJobId, scanResults) {
        for (const result of scanResults) {
            const query = `
                INSERT INTO pr_scan_results 
                (pr_scan_job_id, file_path, change_type, head_content_hash, vulnerabilities_added, vulnerabilities_fixed, vulnerabilities_unchanged, ai_analysis_metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await pool.query(query, [
                prScanJobId,
                result.filePath,
                result.changeType,
                null, // content hash
                JSON.stringify(result.vulnerabilitiesAdded),
                JSON.stringify(result.vulnerabilitiesFixed),
                JSON.stringify(result.vulnerabilitiesUnchanged),
                JSON.stringify(result.aiAnalysisMetadata)
            ]);
        }
    }

    async calculatePRSecuritySummary(prScanJobId, scanResults) {
        let totalAdded = 0, totalFixed = 0, totalUnchanged = 0;
        let criticalAdded = 0, criticalFixed = 0;
        let highAdded = 0, highFixed = 0;

        for (const result of scanResults) {
            totalAdded += result.vulnerabilitiesAdded.length;
            totalFixed += result.vulnerabilitiesFixed.length;
            totalUnchanged += result.vulnerabilitiesUnchanged.length;

            // Count by severity
            result.vulnerabilitiesAdded.forEach(v => {
                if (v.severity === 'critical') criticalAdded++;
                if (v.severity === 'high') highAdded++;
            });

            result.vulnerabilitiesFixed.forEach(v => {
                if (v.severity === 'critical') criticalFixed++;
                if (v.severity === 'high') highFixed++;
            });
        }

        // Calculate security score (0-100)
        const securityScoreBefore = Math.max(0, 100 - (totalUnchanged * 10));
        const securityScoreAfter = Math.max(0, 100 - ((totalUnchanged + totalAdded - totalFixed) * 10));

        // Determine recommendation
        let recommendation = 'approve';
        if (criticalAdded > 0 || highAdded > 2) {
            recommendation = 'block';
        } else if (highAdded > 0 || totalAdded > 5) {
            recommendation = 'review';
        }

        const query = `
            INSERT INTO pr_security_summary 
            (pr_scan_job_id, total_vulnerabilities_added, total_vulnerabilities_fixed, total_vulnerabilities_unchanged,
             critical_added, critical_fixed, high_added, high_fixed, security_score_before, security_score_after, recommendation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        
        await pool.query(query, [
            prScanJobId, totalAdded, totalFixed, totalUnchanged,
            criticalAdded, criticalFixed, highAdded, highFixed,
            securityScoreBefore, securityScoreAfter, recommendation
        ]);
    }

    // Get PR scan results
    async getPRScanResults(userId, prScanJobId) {
        try {
            const query = `
                SELECT psj.*, pr.title as pr_title, pr.github_pr_id, r.name as repo_name, r.full_name as repo_full_name
                FROM pr_scan_jobs psj
                JOIN pull_requests pr ON psj.pull_request_id = pr.id
                JOIN repositories r ON psj.repository_id = r.id
                WHERE psj.id = $1 AND psj.user_id = $2
            `;
            
            const result = await pool.query(query, [prScanJobId, userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const prScanJob = result.rows[0];
            
            // Get PR scan results if completed
            let scanResults = [];
            if (prScanJob.status === 'completed') {
                const resultsQuery = `
                    SELECT psr.*
                    FROM pr_scan_results psr
                    WHERE psr.pr_scan_job_id = $1
                    ORDER BY psr.file_path
                `;
                
                const results = await pool.query(resultsQuery, [prScanJobId]);
                scanResults = results.rows;
            }

            // Get security summary
            let securitySummary = null;
            if (prScanJob.status === 'completed') {
                const summaryQuery = `
                    SELECT pss.*
                    FROM pr_security_summary pss
                    WHERE pss.pr_scan_job_id = $1
                `;
                
                const summary = await pool.query(summaryQuery, [prScanJobId]);
                securitySummary = summary.rows[0] || null;
            }

            return {
                prScanJob: {
                    id: prScanJob.id,
                    status: prScanJob.status,
                    scanType: prScanJob.scan_type,
                    baseCommit: prScanJob.base_commit_sha,
                    headCommit: prScanJob.head_commit_sha,
                    startedAt: prScanJob.started_at,
                    completedAt: prScanJob.completed_at,
                    errorMessage: prScanJob.error_message,
                    pullRequest: {
                        id: prScanJob.pull_request_id,
                        title: prScanJob.pr_title,
                        githubPrId: prScanJob.github_pr_id
                    },
                    repository: {
                        name: prScanJob.repo_name,
                        fullName: prScanJob.repo_full_name
                    }
                },
                results: scanResults,
                securitySummary
            };
        } catch (error) {
            console.error('Get PR scan results error:', error);
            throw error;
        }
    }

    // Get PR security summary
    async getPRSecuritySummary(userId, prId) {
        try {
            const query = `
                SELECT pss.*, psj.scan_type, psj.started_at, psj.completed_at
                FROM pr_security_summary pss
                JOIN pr_scan_jobs psj ON pss.pr_scan_job_id = psj.id
                JOIN pull_requests pr ON psj.pull_request_id = pr.id
                WHERE pr.id = $1 AND psj.user_id = $2
                ORDER BY psj.completed_at DESC
                LIMIT 1
            `;
            
            const result = await pool.query(query, [prId, userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get PR security summary error:', error);
            throw error;
        }
    }

    // Sync PRs from GitHub
    async syncPullRequests(userId, repositoryId) {
        try {
            // Get repository info
            const repoQuery = `
                SELECT r.*, ga.access_token_encrypted, ga.username
                FROM repositories r
                JOIN github_accounts ga ON r.github_account_id = ga.id
                WHERE r.id = $1 AND ga.user_id = $2
            `;
            
            const repoResult = await pool.query(repoQuery, [repositoryId, userId]);
            if (repoResult.rows.length === 0) {
                throw new Error('Repository not found or access denied');
            }

            const repo = repoResult.rows[0];
            const accessToken = githubService.decrypt(repo.access_token_encrypted);
            
            // Fetch PRs from GitHub
            const response = await githubService.makeGitHubRequest(
                accessToken,
                `/repos/${repo.full_name}/pulls?state=all&per_page=${this.maxPRsPerSync}&sort=updated&direction=desc`
            );

            const githubPRs = response.data;
            let prsAdded = 0;
            let prsUpdated = 0;

            for (const githubPR of githubPRs) {
                try {
                    // Check if PR already exists
                    const existingQuery = `
                        SELECT id FROM pull_requests 
                        WHERE repository_id = $1 AND github_pr_id = $2
                    `;
                    const existing = await pool.query(existingQuery, [repositoryId, githubPR.number]);

                    const prData = {
                        repository_id: repositoryId,
                        github_pr_id: githubPR.number,
                        title: githubPR.title.substring(0, 500),
                        description: githubPR.body ? githubPR.body.substring(0, 5000) : null,
                        author_username: githubPR.user.login,
                        author_avatar_url: githubPR.user.avatar_url,
                        base_branch: githubPR.base.ref,
                        head_branch: githubPR.head.ref,
                        base_commit_sha: githubPR.base.sha,
                        head_commit_sha: githubPR.head.sha,
                        status: githubPR.state === 'open' ? 'open' : 'closed',
                        created_at: new Date(githubPR.created_at),
                        updated_at: new Date(githubPR.updated_at),
                        merged_at: githubPR.merged_at ? new Date(githubPR.merged_at) : null
                    };

                    if (existing.rows.length > 0) {
                        // Update existing PR
                        const updateQuery = `
                            UPDATE pull_requests SET
                                title = $1, description = $2, author_username = $3, author_avatar_url = $4,
                                base_branch = $5, head_branch = $6, base_commit_sha = $7, head_commit_sha = $8,
                                status = $9, updated_at = $10, merged_at = $11
                            WHERE id = $12
                        `;
                        await pool.query(updateQuery, [
                            prData.title, prData.description, prData.author_username, prData.author_avatar_url,
                            prData.base_branch, prData.head_branch, prData.base_commit_sha, prData.head_commit_sha,
                            prData.status, prData.updated_at, prData.merged_at, existing.rows[0].id
                        ]);
                        prsUpdated++;
                    } else {
                        // Insert new PR
                        const insertQuery = `
                            INSERT INTO pull_requests 
                            (repository_id, github_pr_id, title, description, author_username, author_avatar_url,
                             base_branch, head_branch, base_commit_sha, head_commit_sha, status, created_at, updated_at, merged_at)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        `;
                        await pool.query(insertQuery, [
                            prData.repository_id, prData.github_pr_id, prData.title, prData.description,
                            prData.author_username, prData.author_avatar_url, prData.base_branch, prData.head_branch,
                            prData.base_commit_sha, prData.head_commit_sha, prData.status, prData.created_at,
                            prData.updated_at, prData.merged_at
                        ]);
                        prsAdded++;
                    }
                } catch (error) {
                    console.error(`Error syncing PR #${githubPR.number}:`, error);
                }
            }

            return { prsAdded, prsUpdated };
        } catch (error) {
            console.error('Sync PRs error:', error);
            throw error;
        }
    }

    // Process GitHub webhook
    async processPRWebhook(webhookData) {
        try {
            const { action, pull_request, repository } = webhookData;
            
            if (!['opened', 'synchronize', 'closed'].includes(action)) {
                return { message: 'Event not relevant for security scanning' };
            }

            // Find repository in our database
            const repoQuery = `
                SELECT r.id, r.github_account_id, ga.user_id
                FROM repositories r
                JOIN github_accounts ga ON r.github_account_id = ga.id
                WHERE r.full_name = $1
            `;
            
            const repoResult = await pool.query(repoQuery, [repository.full_name]);
            if (repoResult.rows.length === 0) {
                return { message: 'Repository not found in our system' };
            }

            const repo = repoResult.rows[0];
            
            // Update or create PR record
            const prData = {
                repository_id: repo.id,
                github_pr_id: pull_request.number,
                title: pull_request.title.substring(0, 500),
                description: pull_request.body ? pull_request.body.substring(0, 5000) : null,
                author_username: pull_request.user.login,
                author_avatar_url: pull_request.user.avatar_url,
                base_branch: pull_request.base.ref,
                head_branch: pull_request.head.ref,
                base_commit_sha: pull_request.base.sha,
                head_commit_sha: pull_request.head.sha,
                status: pull_request.state === 'open' ? 'open' : 'closed',
                updated_at: new Date(pull_request.updated_at),
                merged_at: pull_request.merged_at ? new Date(pull_request.merged_at) : null
            };

            // Upsert PR
            const upsertQuery = `
                INSERT INTO pull_requests 
                (repository_id, github_pr_id, title, description, author_username, author_avatar_url,
                 base_branch, head_branch, base_commit_sha, head_commit_sha, status, created_at, updated_at, merged_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (repository_id, github_pr_id) 
                DO UPDATE SET
                    title = EXCLUDED.title, description = EXCLUDED.description, author_username = EXCLUDED.author_username,
                    author_avatar_url = EXCLUDED.author_avatar_url, base_branch = EXCLUDED.base_branch,
                    head_branch = EXCLUDED.head_branch, base_commit_sha = EXCLUDED.base_commit_sha,
                    head_commit_sha = EXCLUDED.head_commit_sha, status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at, merged_at = EXCLUDED.merged_at
                RETURNING id
            `;
            
            const prResult = await pool.query(upsertQuery, [
                prData.repository_id, prData.github_pr_id, prData.title, prData.description,
                prData.author_username, prData.author_avatar_url, prData.base_branch, prData.head_branch,
                prData.base_commit_sha, prData.head_commit_sha, prData.status, new Date(pull_request.created_at),
                prData.updated_at, prData.merged_at
            ]);

            const prId = prResult.rows[0].id;

            // Auto-trigger scan for new PRs or updates
            if (['opened', 'synchronize'].includes(action)) {
                try {
                    await this.startPRScan(repo.user_id, prId, { scanType: 'pr_diff' });
                    console.log(`Auto-triggered PR scan for PR #${pull_request.number} in ${repository.full_name}`);
                } catch (error) {
                    console.error(`Failed to auto-trigger PR scan:`, error);
                }
            }

            return { message: 'Webhook processed successfully', prId };
        } catch (error) {
            console.error('GitHub webhook error:', error);
            throw error;
        }
    }
}

module.exports = new PRScanningService();


