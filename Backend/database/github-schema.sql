-- Enhanced schema for GitHub integration

-- Users table (existing)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (existing)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GitHub accounts table
CREATE TABLE IF NOT EXISTS github_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    github_id INTEGER UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    access_token_encrypted TEXT NOT NULL, -- Store actual token encrypted
    access_token_hash VARCHAR(500) NOT NULL, -- Keep hash for verification
    refresh_token_encrypted TEXT,
    refresh_token_hash VARCHAR(500),
    token_expires_at TIMESTAMP,
    scopes TEXT[], -- ['repo', 'read:user', 'read:org']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    github_account_id INTEGER REFERENCES github_accounts(id) ON DELETE CASCADE,
    github_repo_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL, -- owner/repo
    description TEXT,
    language VARCHAR(100),
    is_private BOOLEAN DEFAULT FALSE,
    default_branch VARCHAR(100) DEFAULT 'main',
    clone_url VARCHAR(500),
    html_url VARCHAR(500),
    last_commit_sha VARCHAR(40),
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan jobs table
CREATE TABLE IF NOT EXISTS scan_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    scan_type VARCHAR(50) DEFAULT 'full', -- full, incremental, file
    target_branch VARCHAR(100) DEFAULT 'main',
    target_commit_sha VARCHAR(40),
    files_to_scan TEXT[], -- specific files if partial scan
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan results table
CREATE TABLE IF NOT EXISTS scan_results (
    id SERIAL PRIMARY KEY,
    scan_job_id INTEGER REFERENCES scan_jobs(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_content_hash VARCHAR(64), -- SHA-256 hash of file content
    vulnerabilities JSONB NOT NULL, -- array of vulnerability objects
    fixes JSONB, -- array of fix suggestions
    ai_analysis_metadata JSONB, -- model used, confidence scores, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerability details table (normalized for better querying)
CREATE TABLE IF NOT EXISTS vulnerability_details (
    id SERIAL PRIMARY KEY,
    scan_result_id INTEGER REFERENCES scan_results(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL, -- critical, high, medium, low, info
    category VARCHAR(500) NOT NULL, -- sql_injection, xss, auth_bypass, etc.
    line_number INTEGER,
    column_number INTEGER,
    code_snippet TEXT,
    cwe_id VARCHAR(50), -- Common Weakness Enumeration ID
    owasp_category VARCHAR(500), -- OWASP Top 10 category
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan history table (for analytics and reporting)
CREATE TABLE IF NOT EXISTS scan_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    scan_date DATE NOT NULL,
    total_files_scanned INTEGER DEFAULT 0,
    total_vulnerabilities INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    scan_duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure unique constraint for scan history upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uniq_scan_history_user_repo_date'
    ) THEN
        ALTER TABLE scan_history
        ADD CONSTRAINT uniq_scan_history_user_repo_date UNIQUE (user_id, repository_id, scan_date);
    END IF;
END$$;

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    github_integration_enabled BOOLEAN DEFAULT TRUE,
    auto_scan_on_push BOOLEAN DEFAULT FALSE,
    scan_schedule VARCHAR(50), -- daily, weekly, monthly, manual
    notification_preferences JSONB, -- email, webhook, etc.
    scan_filters JSONB, -- file types, severity levels, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON github_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_github_accounts_github_id ON github_accounts(github_id);
CREATE INDEX IF NOT EXISTS idx_repositories_github_account_id ON repositories(github_account_id);
CREATE INDEX IF NOT EXISTS idx_repositories_github_repo_id ON repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_repository_id ON scan_jobs(repository_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_job_id ON scan_results(scan_job_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_details_scan_result_id ON vulnerability_details(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_details_severity ON vulnerability_details(severity);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_repository_id ON scan_history(repository_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scan_date ON scan_history(scan_date);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_status ON scan_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_details_severity_category ON vulnerability_details(severity, category);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_date ON scan_history(user_id, scan_date);

