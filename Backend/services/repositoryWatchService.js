const pool = require('../config/database');
const prScanningService = require('./prScanningService');
const emailService = require('./emailService');

class RepositoryWatchService {
    constructor() {
        this.watchedRepositories = new Map();
        this.webhookSecrets = new Map();
    }

    // Add repository to watch list
    async addRepositoryWatch(userId, repositoryId, options = {}) {
        try {
            const {
                emailNotifications = true,
                scanOnOpen = true,
                scanOnSync = true,
                scanOnMerge = false,
                notificationEmail = null
            } = options;

            // Get user email if not provided
            let email = notificationEmail;
            if (!email) {
                const userQuery = 'SELECT email FROM users WHERE id = $1';
                const userResult = await pool.query(userQuery, [userId]);
                email = userResult.rows[0]?.email;
            }

            if (!email) {
                throw new Error('Email address required for notifications');
            }

            const query = `
                INSERT INTO repository_watches 
                (user_id, repository_id, email_notifications, scan_on_open, scan_on_sync, scan_on_merge, notification_email)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id, repository_id) 
                DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    scan_on_open = EXCLUDED.scan_on_open,
                    scan_on_sync = EXCLUDED.scan_on_sync,
                    scan_on_merge = EXCLUDED.scan_on_merge,
                    notification_email = EXCLUDED.notification_email,
                    is_active = TRUE,
                    updated_at = NOW()
            `;

            await pool.query(query, [
                userId,
                repositoryId,
                emailNotifications,
                scanOnOpen,
                scanOnSync,
                scanOnMerge,
                email
            ]);

            console.log(`Repository watch added: User ${userId}, Repository ${repositoryId}`);
            return true;
        } catch (error) {
            console.error('Failed to add repository watch:', error);
            throw error;
        }
    }

    // Remove repository from watch list
    async removeRepositoryWatch(userId, repositoryId) {
        try {
            const query = `
                UPDATE repository_watches 
                SET is_active = FALSE, updated_at = NOW()
                WHERE user_id = $1 AND repository_id = $2
            `;

            const result = await pool.query(query, [userId, repositoryId]);
            console.log(`Repository watch removed: User ${userId}, Repository ${repositoryId}`);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Failed to remove repository watch:', error);
            throw error;
        }
    }

    // Get watched repositories for a user
    async getWatchedRepositories(userId) {
        try {
            const query = `
                SELECT rw.*, r.name, r.full_name, r.description, r.is_private
                FROM repository_watches rw
                JOIN repositories r ON rw.repository_id = r.id
                WHERE rw.user_id = $1 AND rw.is_active = TRUE
                ORDER BY rw.created_at DESC
            `;

            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Failed to get watched repositories:', error);
            return [];
        }
    }

    // Get all active repository watches
    async getAllActiveWatches() {
        try {
            const query = `
                SELECT rw.*, r.name, r.full_name, u.email as user_email
                FROM repository_watches rw
                JOIN repositories r ON rw.repository_id = r.id
                JOIN users u ON rw.user_id = u.id
                WHERE rw.is_active = TRUE
            `;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Failed to get active watches:', error);
            return [];
        }
    }

    // Handle PR opened event
    async handlePROpened(prData, repositoryId) {
        try {
            console.log(`PR opened: ${prData.title} in repository ${repositoryId}`);

            // Get the database PR ID from the GitHub PR ID
            const prQuery = 'SELECT id FROM pull_requests WHERE github_pr_id = $1 AND repository_id = $2';
            const prResult = await pool.query(prQuery, [prData.id, repositoryId]);
            
            if (prResult.rows.length === 0) {
                console.log(`Pull request ${prData.id} not found in database, skipping email notification`);
                return;
            }
            
            const dbPrId = prResult.rows[0].id;

            // Get watches for this repository
            const watches = await this.getWatchesForRepository(repositoryId);
            
            for (const watch of watches) {
                if (watch.scan_on_open && watch.email_notifications) {
                    // Queue PR opened notification
                    await emailService.queueNotification(
                        watch.user_id,
                        repositoryId,
                        dbPrId,
                        null,
                        'pr_opened',
                        watch.notification_email,
                        {
                            pr_title: prData.title,
                            pr_number: prData.number,
                            pr_author: prData.user?.login || 'Unknown',
                            pr_url: prData.html_url,
                            repo_name: watch.full_name
                        }
                    );

                    // Start automatic scan if enabled
                    if (watch.scan_on_open) {
                        try {
                            // Get the database PR ID from the GitHub PR ID
                            const prQuery = `
                                SELECT id FROM pull_requests 
                                WHERE github_pr_id = $1 AND repository_id = $2
                            `;
                            const prResult = await pool.query(prQuery, [prData.id, repositoryId]);
                            
                            if (prResult.rows.length > 0) {
                                const dbPrId = prResult.rows[0].id;
                                const scanResult = await prScanningService.startPRScan(
                                    watch.user_id,
                                    dbPrId,
                                    { scanType: 'pr_diff' }
                                );
                                
                                console.log(`Auto-scan started for PR ${prData.number} (DB ID: ${dbPrId}):`, scanResult);
                            } else {
                                console.log(`Pull request ${prData.number} not found in database, skipping auto-scan`);
                            }
                        } catch (scanError) {
                            console.error(`Failed to start auto-scan for PR ${prData.id}:`, scanError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to handle PR opened:', error);
        }
    }

    // Handle PR scan completed
    async handleScanCompleted(prScanJobId, scanResults) {
        try {
            console.log(`Scan completed: ${prScanJobId}`);

            // Get scan job details
            const scanJobQuery = `
                SELECT psj.*, pr.title, pr.github_pr_id as number, pr.html_url, r.full_name, rw.user_id, rw.notification_email
                FROM pr_scan_jobs psj
                JOIN pull_requests pr ON psj.pull_request_id = pr.id
                JOIN repositories r ON psj.repository_id = r.id
                JOIN repository_watches rw ON rw.repository_id = r.id AND rw.user_id = psj.user_id
                WHERE psj.id = $1 AND rw.is_active = TRUE
            `;

            const result = await pool.query(scanJobQuery, [prScanJobId]);
            if (result.rows.length === 0) return;

            const scanJob = result.rows[0];

            // Get security summary
            const summaryQuery = 'SELECT * FROM pr_security_summary WHERE pr_scan_job_id = $1';
            const summaryResult = await pool.query(summaryQuery, [prScanJobId]);
            const summary = summaryResult.rows[0];

            // Determine notification type based on results
            const vulnerabilityCount = summary?.total_vulnerabilities_added || 0;
            const criticalCount = summary?.critical_added || 0;
            const highCount = summary?.high_added || 0;
            const mediumCount = summary?.medium_added || 0;

            let notificationType = 'scan_completed';
            if (vulnerabilityCount > 0) {
                notificationType = 'vulnerability_found';
            }

            // Queue notification
            await emailService.queueNotification(
                scanJob.user_id,
                scanJob.repository_id,
                scanJob.pull_request_id,
                prScanJobId,
                notificationType,
                scanJob.notification_email,
                {
                    pr_title: scanJob.title,
                    pr_number: scanJob.number,
                    pr_url: scanJob.html_url,
                    repo_name: scanJob.full_name,
                    scan_status: scanJob.status,
                    vulnerability_count: vulnerabilityCount,
                    critical_count: criticalCount,
                    high_count: highCount,
                    medium_count: mediumCount,
                    security_score: summary?.security_score_after || 0,
                    recommendation: summary?.recommendation || 'review',
                    results_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pr/scan/${prScanJobId}`
                }
            );

        } catch (error) {
            console.error('Failed to handle scan completed:', error);
        }
    }

    // Handle PR scan failed
    async handleScanFailed(prScanJobId, errorMessage) {
        try {
            console.log(`Scan failed: ${prScanJobId}`);

            // Get scan job details
            const scanJobQuery = `
                SELECT psj.*, pr.title, pr.github_pr_id as number, pr.html_url, r.full_name, rw.user_id, rw.notification_email
                FROM pr_scan_jobs psj
                JOIN pull_requests pr ON psj.pull_request_id = pr.id
                JOIN repositories r ON psj.repository_id = r.id
                JOIN repository_watches rw ON rw.repository_id = r.id AND rw.user_id = psj.user_id
                WHERE psj.id = $1 AND rw.is_active = TRUE
            `;

            const result = await pool.query(scanJobQuery, [prScanJobId]);
            if (result.rows.length === 0) return;

            const scanJob = result.rows[0];

            // Queue failure notification
            await emailService.queueNotification(
                scanJob.user_id,
                scanJob.repository_id,
                scanJob.pull_request_id,
                prScanJobId,
                'scan_failed',
                scanJob.notification_email,
                {
                    pr_title: scanJob.title,
                    pr_number: scanJob.number,
                    pr_url: scanJob.html_url,
                    repo_name: scanJob.full_name,
                    error_message: errorMessage
                }
            );

        } catch (error) {
            console.error('Failed to handle scan failed:', error);
        }
    }

    // Get watches for a specific repository
    async getWatchesForRepository(repositoryId) {
        try {
            const query = `
                SELECT rw.*, u.email as user_email
                FROM repository_watches rw
                JOIN users u ON rw.user_id = u.id
                WHERE rw.repository_id = $1 AND rw.is_active = TRUE
            `;

            const result = await pool.query(query, [repositoryId]);
            return result.rows;
        } catch (error) {
            console.error('Failed to get watches for repository:', error);
            return [];
        }
    }

    // Update watch settings
    async updateWatchSettings(userId, repositoryId, settings) {
        try {
            const {
                emailNotifications,
                scanOnOpen,
                scanOnSync,
                scanOnMerge,
                notificationEmail
            } = settings;

            const query = `
                UPDATE repository_watches 
                SET 
                    email_notifications = COALESCE($3, email_notifications),
                    scan_on_open = COALESCE($4, scan_on_open),
                    scan_on_sync = COALESCE($5, scan_on_sync),
                    scan_on_merge = COALESCE($6, scan_on_merge),
                    notification_email = COALESCE($7, notification_email),
                    updated_at = NOW()
                WHERE user_id = $1 AND repository_id = $2 AND is_active = TRUE
            `;

            const result = await pool.query(query, [
                userId,
                repositoryId,
                emailNotifications,
                scanOnOpen,
                scanOnSync,
                scanOnMerge,
                notificationEmail
            ]);

            return result.rowCount > 0;
        } catch (error) {
            console.error('Failed to update watch settings:', error);
            throw error;
        }
    }
}

module.exports = new RepositoryWatchService();
