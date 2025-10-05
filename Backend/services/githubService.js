const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/database');

// Simple encryption/decryption for tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

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
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        // If decryption fails, return the original text (might be plain text)
        return encryptedText;
    }
}

class GitHubService {
    constructor() {
        this.clientId = process.env.GITHUB_CLIENT_ID;
        this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
        this.redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/github/callback';
        this.baseURL = 'https://api.github.com';
    }

    // Generate GitHub OAuth URL
    generateAuthURL(state) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: 'repo,read:user,read:org',
            state: state,
            allow_signup: 'true'
        });

        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    // Exchange code for access token
    async exchangeCodeForToken(code) {
        try {
            // GitHub recommends x-www-form-urlencoded for this endpoint
            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                redirect_uri: this.redirectUri
            });


            const response = await axios.post(
                'https://github.com/login/oauth/access_token',
                params.toString(),
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );


            return response.data;
        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error('GitHub token exchange error:', { status, data, message: error.message, redirectUri: this.redirectUri });
            throw new Error(data?.error_description || 'Failed to get access token');
        }
    }

    // Get GitHub user information
    async getUserInfo(accessToken) {
        try {
            const response = await axios.get(`${this.baseURL}/user`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub user info error:', error);
            throw new Error('Failed to get user information');
        }
    }

    // Get user repositories
    async getUserRepositories(accessToken, page = 1, perPage = 100) {
        try {
            const response = await axios.get(`${this.baseURL}/user/repos`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    page,
                    per_page: perPage,
                    sort: 'updated',
                    direction: 'desc'
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub repositories error:', error);
            throw new Error('Failed to get repositories');
        }
    }

    // Get repository contents
    async getRepositoryContents(accessToken, owner, repo, path = '', ref = 'main') {
        try {
            const encodedPath = path
                ? encodeURIComponent(path).replace(/%2F/g, '/')
                : '';
            const url = `${this.baseURL}/repos/${owner}/${repo}/contents/${encodedPath}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    ref: ref
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub repository contents error:', error);
            throw new Error('Failed to get repository contents');
        }
    }

    // Get file content
    async getFileContent(accessToken, owner, repo, path, ref = 'main', sha = undefined) {
        try {
            const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
            const url = `${this.baseURL}/repos/${owner}/${repo}/contents/${encodedPath}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    ref: ref
                }
            });

            if (response.data && response.data.content) {
                const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                return { ...response.data, content };
            }
            throw new Error('Not a file');
        } catch (error) {
            // Fallback: use Git blob API if we have a SHA (works for large files and some edge cases)
            if (sha) {
                try {
                    const blobUrl = `${this.baseURL}/repos/${owner}/${repo}/git/blobs/${sha}`;
                    const blobResp = await axios.get(blobUrl, {
                        headers: {
                            'Authorization': `token ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    if (blobResp.data && blobResp.data.content) {
                        const content = Buffer.from(blobResp.data.content, 'base64').toString('utf-8');
                        return { path, content, encoding: 'utf-8', sha };
                    }
                } catch (blobErr) {
                    console.error('GitHub blob fetch error:', blobErr);
                }
            }
            console.error('GitHub file content error:', error);
            throw new Error('Failed to get file content');
        }
    }

    // Get repository languages
    async getRepositoryLanguages(accessToken, owner, repo) {
        try {
            const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/languages`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub languages error:', error);
            throw new Error('Failed to get repository languages');
        }
    }

    // Get repository commits
    async getRepositoryCommits(accessToken, owner, repo, branch = 'main', perPage = 10) {
        try {
            const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/commits`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    sha: branch,
                    per_page: perPage
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub commits error:', error);
            throw new Error('Failed to get repository commits');
        }
    }

    // Hash sensitive data
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Store GitHub account in database
    async storeGitHubAccount(userId, githubData, tokenData) {
        try {
            const { id, login, name, avatar_url } = githubData;
            const { access_token, refresh_token, expires_in } = tokenData;


            // Validate required data
            if (!access_token) {
                throw new Error('Access token is required but was not provided');
            }

            const query = `
                INSERT INTO github_accounts 
                (user_id, github_id, username, display_name, avatar_url, access_token, token_type, scope, access_token_encrypted, access_token_hash, refresh_token_encrypted, refresh_token_hash, token_expires_at, scopes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (github_id) 
                DO UPDATE SET 
                    access_token = EXCLUDED.access_token,
                    token_type = EXCLUDED.token_type,
                    scope = EXCLUDED.scope,
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    access_token_hash = EXCLUDED.access_token_hash,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    refresh_token_hash = EXCLUDED.refresh_token_hash,
                    token_expires_at = EXCLUDED.token_expires_at,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            `;

            const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
            const scopes = ['repo', 'read:user', 'read:org'];

            const result = await pool.query(query, [
                userId,
                id,
                login,
                name,
                avatar_url,
                access_token, // Store plain token in access_token column
                'bearer', // token_type
                'repo,read:user,read:org', // scope
                encrypt(access_token), // access_token_encrypted
                this.hashToken(access_token), // access_token_hash
                refresh_token ? encrypt(refresh_token) : null, // refresh_token_encrypted
                refresh_token ? this.hashToken(refresh_token) : null, // refresh_token_hash
                expiresAt, // token_expires_at
                scopes // scopes array
            ]);

            return result.rows[0].id;
        } catch (error) {
            console.error('Store GitHub account error:', error);
            throw new Error('Failed to store GitHub account');
        }
    }

    // Store repositories in database
    async storeRepositories(githubAccountId, repositories) {
        try {
            const query = `
                INSERT INTO repositories 
                (github_account_id, github_repo_id, name, full_name, description, language, is_private, default_branch, clone_url, html_url, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (github_repo_id) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    full_name = EXCLUDED.full_name,
                    description = EXCLUDED.description,
                    language = EXCLUDED.language,
                    is_private = EXCLUDED.is_private,
                    default_branch = EXCLUDED.default_branch,
                    clone_url = EXCLUDED.clone_url,
                    html_url = EXCLUDED.html_url,
                    last_updated = EXCLUDED.last_updated,
                    updated_at = CURRENT_TIMESTAMP
            `;

            for (const repo of repositories) {
                await pool.query(query, [
                    githubAccountId,
                    repo.id,
                    repo.name,
                    repo.full_name,
                    repo.description,
                    repo.language,
                    repo.private,
                    repo.default_branch,
                    repo.clone_url,
                    repo.html_url,
                    new Date(repo.updated_at)
                ]);
            }
        } catch (error) {
            console.error('Store repositories error:', error);
            throw new Error('Failed to store repositories');
        }
    }

    // Get user's GitHub account
    async getGitHubAccount(userId) {
        try {
            const query = 'SELECT * FROM github_accounts WHERE user_id = $1';
            const result = await pool.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get GitHub account error:', error);
            throw new Error('Failed to get GitHub account');
        }
    }

    // Get user's repositories
    async getUserRepositoriesFromDB(userId) {
        try {
            const query = `
                SELECT r.*, ga.username as owner_username
                FROM repositories r
                JOIN github_accounts ga ON r.github_account_id = ga.id
                WHERE ga.user_id = $1
                ORDER BY r.updated_at DESC
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Get user repositories error:', error);
            throw new Error('Failed to get user repositories');
        }
    }

    // Get decrypted access token for a user
    async getAccessToken(userId) {
        try {
            const query = 'SELECT access_token, access_token_encrypted FROM github_accounts WHERE user_id = $1';
            const result = await pool.query(query, [userId]);
            if (result.rows.length === 0) {
                throw new Error('GitHub account not found');
            }
            
            const { access_token, access_token_encrypted } = result.rows[0];
            
            // Prefer access_token (plain text) over access_token_encrypted
            if (access_token) {
                return access_token;
            } else if (access_token_encrypted) {
                return decrypt(access_token_encrypted);
            } else {
                throw new Error('GitHub token not stored yet. Please disconnect and reconnect.');
            }
        } catch (error) {
            console.error('Get access token error:', error);
            throw new Error('Failed to get access token');
        }
    }

    // Get repository information
    async getRepositoryInfo(accessToken, owner, repo) {
        try {
            const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('GitHub repository info error:', error);
            throw new Error('Failed to get repository information');
        }
    }

    // Utility methods for encryption/decryption
    encrypt(text) {
        return encrypt(text);
    }

    decrypt(encryptedText) {
        return decrypt(encryptedText);
    }

    // Make GitHub API requests
    async makeGitHubRequest(accessToken, endpoint) {
        try {
            // Remove leading slash from endpoint if present to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
            const url = `${this.baseURL}/${cleanEndpoint}`;
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response;
        } catch (error) {
            console.error('GitHub API request error:', error);
            
            // Preserve more detailed error information
            if (error.response) {
                const status = error.response.status;
                const statusText = error.response.statusText;
                const message = error.response.data?.message || error.message;
                throw new Error(`GitHub API request failed: ${status} ${statusText} - ${message}`);
            } else if (error.request) {
                throw new Error(`GitHub API request failed: No response received - ${error.message}`);
            } else {
                throw new Error(`GitHub API request failed: ${error.message}`);
            }
        }
    }
}

// Export the service instance and utility functions
const githubService = new GitHubService();
module.exports = githubService;

// Also export the utility functions for use in other services
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
