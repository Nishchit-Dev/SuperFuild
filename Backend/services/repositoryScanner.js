const { analyzeCode } = require('../lib/ai');
const githubService = require('./githubService');
const pool = require('../config/database');
const crypto = require('crypto');

class RepositoryScanner {
    constructor() {
        this.supportedFileTypes = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs',
            '.cpp', '.c', '.cs', '.swift', '.kt', '.scala', '.sh', '.sql', '.html', '.css'
        ];
        this.maxFileSize = 1024 * 1024; // 1MB
        this.maxFilesPerScan = 1000;
    }

    // Start a repository scan
    async startScan(userId, repositoryId, options = {}) {
        try {
            const {
                scanType = 'full',
                targetBranch = 'main',
                filesToScan = [],
                targetCommit = null
            } = options;

            // Get repository and GitHub account info
            const repoInfo = await this.getRepositoryInfo(repositoryId, userId);
            if (!repoInfo) {
                throw new Error('Repository not found or access denied');
            }

            // Create scan job
            const scanJobId = await this.createScanJob(userId, repositoryId, {
                scanType,
                targetBranch,
                targetCommit,
                filesToScan
            });

            // Start scanning in background
            this.performScan(scanJobId, repoInfo, options).catch(error => {
                console.error('Scan error:', error);
                this.updateScanJobStatus(scanJobId, 'failed', error.message);
            });

            return { scanJobId, status: 'started' };
        } catch (error) {
            console.error('Start scan error:', error);
            throw error;
        }
    }

    // Perform the actual scan
    async performScan(scanJobId, repoInfo, options) {
        try {
            await this.updateScanJobStatus(scanJobId, 'running');

            const { accessToken, username, repoName, targetBranch } = repoInfo;
            
            // Get files to scan
            const filesToScan = await this.getFilesToScan(
                accessToken, 
                username, 
                repoName, 
                targetBranch, 
                options
            );

            console.log(`Scanning ${filesToScan.length} files for repository ${username}/${repoName}`);
            
            // Debug: Log all files to scan
            console.log('Files to scan:');
            filesToScan.forEach((file, index) => {
                console.log(`  ${index + 1}. Path: "${file.path}", Size: ${file.size}, SHA: ${file.sha}`);
            });

            let totalVulnerabilities = 0;
            const scanResults = [];

            // Process files in batches
            const batchSize = 10;
            for (let i = 0; i < filesToScan.length; i += batchSize) {
                const batch = filesToScan.slice(i, i + batchSize);
                const batchPromises = batch.map(file => this.scanFile(accessToken, username, repoName, file, targetBranch));
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        scanResults.push(result.value);
                        totalVulnerabilities += result.value.vulnerabilities.length;
                    }
                }

                // Update progress
                const progress = Math.round(((i + batchSize) / filesToScan.length) * 100);
                await this.updateScanJobProgress(scanJobId, Math.min(progress, 100));
            }

            // Store scan results
            await this.storeScanResults(scanJobId, scanResults);

            // Update scan history
            await this.updateScanHistory(repoInfo.userId, repoInfo.repositoryId, {
                totalFilesScanned: filesToScan.length,
                totalVulnerabilities,
                scanDuration: Date.now() - (await this.getScanJobStartTime(scanJobId))
            });

            await this.updateScanJobStatus(scanJobId, 'completed');
            
            console.log(`Scan completed for ${username}/${repoName}: ${totalVulnerabilities} vulnerabilities found`);

        } catch (error) {
            console.error('Perform scan error:', error);
            await this.updateScanJobStatus(scanJobId, 'failed', error.message);
            throw error;
        }
    }

    // Get files to scan based on scan type
    async getFilesToScan(accessToken, username, repoName, branch, options) {
        const { scanType, filesToScan } = options;

        if (scanType === 'file' && filesToScan.length > 0) {
            return filesToScan;
        }

        // Get all files from repository
        const allFiles = await this.getAllRepositoryFiles(accessToken, username, repoName, branch);
        
        // Filter by supported file types
        const supportedFiles = allFiles.filter(file => 
            this.supportedFileTypes.some(ext => file.path.toLowerCase().endsWith(ext))
        );

        // Limit number of files
        return supportedFiles.slice(0, this.maxFilesPerScan);
    }

    // Get all files from repository recursively
    async getAllRepositoryFiles(accessToken, username, repoName, branch) {
        const files = [];
        
        // First, try to get the repository info to check the actual default branch
        let actualBranch = branch;
        try {
            const repoInfo = await githubService.getRepositoryInfo(accessToken, username, repoName);
            if (repoInfo && repoInfo.default_branch) {
                actualBranch = repoInfo.default_branch;
                console.log(`Using actual default branch: ${actualBranch}`);
            }
        } catch (error) {
            console.warn('Could not fetch repository info, using provided branch:', branch);
        }
        
        const scanDirectory = async (path = '') => {
            try {
                const contents = await githubService.getRepositoryContents(accessToken, username, repoName, path, actualBranch);
                
                for (const item of contents) {
                    // Skip items with null or undefined paths
                    if (!item || !item.path) {
                        console.warn('Skipping item with null/undefined path:', item);
                        continue;
                    }
                    
                    if (item.type === 'file') {
                        // Check file size
                        if (item.size <= this.maxFileSize) {
                            files.push({
                                path: item.path,
                                size: item.size,
                                sha: item.sha
                            });
                        }
                    } else if (item.type === 'dir') {
                        // Skip certain directories
                        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
                        if (!skipDirs.some(dir => item.path.includes(dir))) {
                            await scanDirectory(item.path);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${path}:`, error.message);
                // If main branch fails, try master
                if (actualBranch === 'main' && error.response?.status === 404) {
                    try {
                        console.log('Trying master branch instead...');
                        const contents = await githubService.getRepositoryContents(accessToken, username, repoName, path, 'master');
                        for (const item of contents) {
                            // Skip items with null or undefined paths
                            if (!item || !item.path) {
                                console.warn('Skipping item with null/undefined path (fallback):', item);
                                continue;
                            }
                            
                            if (item.type === 'file') {
                                if (item.size <= this.maxFileSize) {
                                    files.push({
                                        path: item.path,
                                        size: item.size,
                                        sha: item.sha
                                    });
                                }
                            } else if (item.type === 'dir') {
                                const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
                                if (!skipDirs.some(dir => item.path.includes(dir))) {
                                    await scanDirectory(item.path);
                                }
                            }
                        }
                    } catch (masterError) {
                        console.error(`Error scanning directory ${path} with master branch:`, masterError.message);
                    }
                }
            }
        };

        await scanDirectory();
        return files;
    }

    // Scan a single file
    async scanFile(accessToken, username, repoName, file, branch) {
        try {
            // Validate file object and path
            if (!file || !file.path) {
                console.warn('Skipping file with null/undefined path:', file);
                return {
                    filePath: file?.path || 'unknown',
                    fileContentHash: null,
                    vulnerabilities: [],
                    fixes: [],
                    error: 'Invalid file path'
                };
            }
            
            // Get file content
            const fileContent = await githubService.getFileContent(accessToken, username, repoName, file.path, branch, file.sha);
            
            // Analyze code with AI
            const analysis = await analyzeCode(fileContent.content, file.path);
            
            // Process vulnerabilities
            const rawVulns = this.processVulnerabilities(analysis.vulnerabilities || [], file.path);
            const vulnerabilities = this.dedupeVulnerabilities(rawVulns);
            const fixes = this.dedupeFixes(analysis.fixes || []);

            return {
                filePath: file.path,
                fileContentHash: crypto.createHash('sha256').update(fileContent.content).digest('hex'),
                vulnerabilities,
                fixes,
                aiAnalysisMetadata: {
                    model: 'gemini-1.5-flash',
                    timestamp: new Date().toISOString(),
                    fileSize: file.size
                }
            };
        } catch (error) {
            console.error(`Error scanning file ${file.path}:`, error.message);
            return {
                filePath: file.path,
                fileContentHash: null,
                vulnerabilities: [],
                fixes: [],
                error: error.message
            };
        }
    }

    // Process vulnerabilities from AI analysis
    processVulnerabilities(vulnerabilities, filePath) {
        return vulnerabilities.map(vuln => ({
            title: vuln.title || 'Security Issue',
            description: vuln.description || '',
            severity: this.normalizeSeverity(vuln.severity),
            category: this.categorizeVulnerability(vuln.title, vuln.description),
            lineNumber: vuln.line ? parseInt(vuln.line) : (vuln.startingLine ? parseInt(vuln.startingLine) : null),
            columnNumber: null,
            codeSnippet: vuln.snippet || vuln.codeSnippet || '',
            cweId: vuln.cweId || this.getCWEId(vuln.title, vuln.description),
            owaspCategory: vuln.owaspCategory || this.getOWASPCategory(vuln.title, vuln.description),
            confidenceScore: vuln.confidenceScore || 0.8 // Default confidence score
        }));
    }

    // Normalize severity levels
    normalizeSeverity(severity) {
        const normalized = severity?.toLowerCase();
        const severityMap = {
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low',
            'info': 'info'
        };
        return severityMap[normalized] || 'medium';
    }

    // Categorize vulnerability
    categorizeVulnerability(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        
        if (text.includes('sql injection') || text.includes('sql injection')) return 'sql_injection';
        if (text.includes('xss') || text.includes('cross-site scripting')) return 'xss';
        if (text.includes('authentication') || text.includes('auth')) return 'authentication';
        if (text.includes('authorization') || text.includes('access control')) return 'authorization';
        if (text.includes('injection')) return 'injection';
        if (text.includes('csrf') || text.includes('cross-site request forgery')) return 'csrf';
        if (text.includes('crypto') || text.includes('encryption')) return 'cryptography';
        if (text.includes('input validation') || text.includes('validation')) return 'input_validation';
        
        return 'general';
    }

    // Get CWE ID based on vulnerability
    getCWEId(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        
        if (text.includes('sql injection')) return 'CWE-89';
        if (text.includes('xss')) return 'CWE-79';
        if (text.includes('csrf')) return 'CWE-352';
        if (text.includes('authentication')) return 'CWE-287';
        if (text.includes('authorization')) return 'CWE-285';
        if (text.includes('eval') || text.includes('arbitrary code execution')) return 'CWE-95';
        if (text.includes('injection')) return 'CWE-74';
        if (text.includes('command injection')) return 'CWE-78';
        if (text.includes('path traversal')) return 'CWE-22';
        if (text.includes('deserialization')) return 'CWE-502';
        if (text.includes('crypto') || text.includes('encryption')) return 'CWE-327';
        if (text.includes('input validation')) return 'CWE-20';
        
        return null;
    }

    // Get OWASP category
    getOWASPCategory(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        
        if (text.includes('injection')) return 'A03:2021 – Injection';
        if (text.includes('xss')) return 'A03:2021 – Injection';
        if (text.includes('authentication')) return 'A07:2021 – Identification and Authentication Failures';
        if (text.includes('authorization')) return 'A01:2021 – Broken Access Control';
        if (text.includes('crypto')) return 'A02:2021 – Cryptographic Failures';
        if (text.includes('eval') || text.includes('arbitrary code execution')) return 'A04:2021 – Insecure Design';
        if (text.includes('command injection')) return 'A03:2021 – Injection';
        if (text.includes('path traversal')) return 'A01:2021 – Broken Access Control';
        if (text.includes('deserialization')) return 'A08:2021 – Software and Data Integrity Failures';
        if (text.includes('input validation')) return 'A05:2021 – Security Misconfiguration';
        
        return 'A04:2021 – Insecure Design';
    }

    // Database operations
    // Helper to enforce DB column limits defensively
    truncate(value, maxLength) {
        if (value === null || value === undefined) return value;
        const str = String(value);
        return str.length > maxLength ? str.slice(0, maxLength) : str;
    }

    // Deduplicate vulnerabilities by (filePath, title, category, lineNumber)
    dedupeVulnerabilities(vulns) {
        const seen = new Set();
        const unique = [];
        for (const v of vulns) {
            const key = [
                (v.filePath || ''),
                (v.title || '').toLowerCase().trim(),
                (v.category || '').toLowerCase().trim(),
                (v.lineNumber ?? -1)
            ].join('|');
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(v);
            }
        }
        return unique;
    }

    // Deduplicate fixes by (line,suggestion)
    dedupeFixes(fixes) {
        const seen = new Set();
        const unique = [];
        for (const f of fixes) {
            const key = `${String(f.line || '').trim()}|${String(f.suggestion || '').trim()}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(f);
            }
        }
        return unique;
    }

    async createScanJob(userId, repositoryId, options) {
        const query = `
            INSERT INTO scan_jobs (user_id, repository_id, scan_type, target_branch, target_commit_sha, files_to_scan, started_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;
        
        const result = await pool.query(query, [
            userId,
            repositoryId,
            options.scanType,
            options.targetBranch,
            options.targetCommit,
            options.filesToScan,
            new Date()
        ]);
        
        return result.rows[0].id;
    }

    async updateScanJobStatus(scanJobId, status, errorMessage = null) {
        const query = `
            UPDATE scan_jobs 
            SET status = $1, error_message = $2, completed_at = $3
            WHERE id = $4
        `;
        
        await pool.query(query, [
            status,
            errorMessage,
            status === 'completed' || status === 'failed' ? new Date() : null,
            scanJobId
        ]);
    }

    async updateScanJobProgress(scanJobId, progress) {
        // Store progress in scan job metadata or separate table
        console.log(`Scan ${scanJobId} progress: ${progress}%`);
    }

    async storeScanResults(scanJobId, scanResults) {
        for (const result of scanResults) {
            // Store scan result
            const resultQuery = `
                INSERT INTO scan_results (scan_job_id, file_path, file_content_hash, vulnerabilities, fixes, ai_analysis_metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;
            
            const resultData = await pool.query(resultQuery, [
                scanJobId,
                result.filePath,
                result.fileContentHash,
                JSON.stringify(result.vulnerabilities),
                JSON.stringify(result.fixes),
                JSON.stringify(result.aiAnalysisMetadata)
            ]);
            
            const scanResultId = resultData.rows[0].id;
            
            // Store individual vulnerabilities
            for (const vuln of result.vulnerabilities) {
                const vulnQuery = `
                    INSERT INTO vulnerability_details 
                    (scan_result_id, title, description, severity, category, line_number, column_number, code_snippet, cwe_id, owasp_category, confidence_score)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `;
                
                // Defensive truncation to avoid DB varchar overflows
                const safeTitle = this.truncate(vuln.title, 255);
                const safeSeverity = this.truncate(vuln.severity, 50);
                const safeCategory = this.truncate(vuln.category, 500); // Maximized to 500
                const safeCodeSnippet = vuln.codeSnippet; // TEXT
                const safeCweId = this.truncate(vuln.cweId, 50); // Maximized to 50
                const safeOwasp = this.truncate(vuln.owaspCategory, 500); // Maximized to 500

                await pool.query(vulnQuery, [
                    scanResultId,
                    safeTitle,
                    vuln.description,
                    safeSeverity,
                    safeCategory,
                    vuln.lineNumber,
                    vuln.columnNumber,
                    safeCodeSnippet,
                    safeCweId,
                    safeOwasp,
                    vuln.confidenceScore
                ]);
            }
        }
    }

    async updateScanHistory(userId, repositoryId, stats) {
        const query = `
            INSERT INTO scan_history 
            (user_id, repository_id, scan_date, total_files_scanned, total_vulnerabilities, critical_count, high_count, medium_count, low_count, scan_duration_seconds)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id, repository_id, scan_date)
            DO UPDATE SET
                total_files_scanned = EXCLUDED.total_files_scanned,
                total_vulnerabilities = EXCLUDED.total_vulnerabilities,
                critical_count = EXCLUDED.critical_count,
                high_count = EXCLUDED.high_count,
                medium_count = EXCLUDED.medium_count,
                low_count = EXCLUDED.low_count,
                scan_duration_seconds = EXCLUDED.scan_duration_seconds
        `;
        
        await pool.query(query, [
            userId,
            repositoryId,
            new Date().toISOString().split('T')[0],
            stats.totalFilesScanned,
            stats.totalVulnerabilities,
            stats.criticalCount || 0,
            stats.highCount || 0,
            stats.mediumCount || 0,
            stats.lowCount || 0,
            Math.round(stats.scanDuration / 1000)
        ]);
    }

    async getRepositoryInfo(repositoryId, userId) {
        const query = `
            SELECT r.*, ga.access_token, ga.access_token_encrypted, ga.username
            FROM repositories r
            JOIN github_accounts ga ON r.github_account_id = ga.id
            WHERE r.id = $1 AND ga.user_id = $2
        `;
        
        const result = await pool.query(query, [repositoryId, userId]);
        if (result.rows.length === 0) return null;
        
        const row = result.rows[0];
        if (!row.access_token && !row.access_token_encrypted) {
            throw new Error('GitHub token not available. Please reconnect your account.');
        }
        
        // Decrypt the access token
        const crypto = require('crypto');
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
        const ALGORITHM = 'aes-256-cbc';
        
        function decrypt(encryptedText) {
            // Check if it's a plain text token (starts with ghp_ or gho_)
            if (encryptedText.startsWith('ghp_') || encryptedText.startsWith('gho_')) {
                return encryptedText; // Return as-is if it's already plain text
            }
            
            // Otherwise, try to decrypt it
            try {
                const textParts = encryptedText.split(':');
                const iv = Buffer.from(textParts.shift(), 'hex');
                const encryptedData = textParts.join(':');
                
                // New scheme (matches githubService encrypt): scrypt-derived key + createCipheriv
                const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
                const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
                let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            } catch (e) {
                // Backward-compat: legacy createDecipher fallback
                try {
                    const legacyDecipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
                    let legacyDecrypted = legacyDecipher.update(encryptedText, 'hex', 'utf8');
                    legacyDecrypted += legacyDecipher.final('utf8');
                    return legacyDecrypted;
                } catch (_) {
                    // If all decryption attempts fail, return the original text (might be plain text)
                    console.error('Decryption error:', e);
                    return encryptedText;
                }
            }
        }
        
        // Prefer access_token (plain text) over access_token_encrypted
        let accessToken;
        if (row.access_token) {
            accessToken = row.access_token;
        } else if (row.access_token_encrypted) {
            accessToken = decrypt(row.access_token_encrypted);
        } else {
            throw new Error('No access token found');
        }
        
        return {
            ...row,
            accessToken: accessToken,
            username: row.username,
            repoName: row.name,
            userId: userId
        };
    }

    async getScanJobStartTime(scanJobId) {
        const query = 'SELECT started_at FROM scan_jobs WHERE id = $1';
        const result = await pool.query(query, [scanJobId]);
        return result.rows[0]?.started_at || new Date();
    }
}

module.exports = new RepositoryScanner();

