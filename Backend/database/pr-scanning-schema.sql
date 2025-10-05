-- PR Scanning Schema Extensions

-- Pull Requests table
CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    github_pr_id INTEGER NOT NULL, -- GitHub PR number
    title VARCHAR(500) NOT NULL,
    description TEXT,
    author_username VARCHAR(255) NOT NULL,
    author_avatar_url VARCHAR(500),
    base_branch VARCHAR(100) NOT NULL,
    head_branch VARCHAR(100) NOT NULL,
    base_commit_sha VARCHAR(40) NOT NULL,
    head_commit_sha VARCHAR(40) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, closed, merged
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    merged_at TIMESTAMP,
    UNIQUE(repository_id, github_pr_id)
);

-- PR Scan Jobs (extends scan_jobs)
CREATE TABLE IF NOT EXISTS pr_scan_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pull_request_id INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) DEFAULT 'pr_diff', -- pr_diff, pr_full, pr_targeted
    base_commit_sha VARCHAR(40) NOT NULL,
    head_commit_sha VARCHAR(40) NOT NULL,
    files_changed TEXT[], -- List of changed files
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PR Scan Results (extends scan_results)
CREATE TABLE IF NOT EXISTS pr_scan_results (
    id SERIAL PRIMARY KEY,
    pr_scan_job_id INTEGER REFERENCES pr_scan_jobs(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- added, modified, deleted
    base_content_hash VARCHAR(64),
    head_content_hash VARCHAR(64),
    vulnerabilities_added JSONB, -- New vulnerabilities in PR
    vulnerabilities_fixed JSONB, -- Vulnerabilities fixed in PR
    vulnerabilities_unchanged JSONB, -- Existing vulnerabilities
    ai_analysis_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PR Security Summary
CREATE TABLE IF NOT EXISTS pr_security_summary (
    id SERIAL PRIMARY KEY,
    pr_scan_job_id INTEGER REFERENCES pr_scan_jobs(id) ON DELETE CASCADE,
    total_vulnerabilities_added INTEGER DEFAULT 0,
    total_vulnerabilities_fixed INTEGER DEFAULT 0,
    total_vulnerabilities_unchanged INTEGER DEFAULT 0,
    critical_added INTEGER DEFAULT 0,
    critical_fixed INTEGER DEFAULT 0,
    high_added INTEGER DEFAULT 0,
    high_fixed INTEGER DEFAULT 0,
    security_score_before DECIMAL(5,2), -- 0-100
    security_score_after DECIMAL(5,2), -- 0-100
    recommendation VARCHAR(50), -- approve, review, block
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GitHub Webhooks table
CREATE TABLE IF NOT EXISTS github_webhooks (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    webhook_id INTEGER NOT NULL, -- GitHub webhook ID
    webhook_url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- ['pull_request', 'push']
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id ON pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_github_pr_id ON pull_requests(github_pr_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status ON pull_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_scan_jobs_pull_request_id ON pr_scan_jobs(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_scan_jobs_status ON pr_scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pr_scan_results_pr_scan_job_id ON pr_scan_results(pr_scan_job_id);
CREATE INDEX IF NOT EXISTS idx_pr_security_summary_pr_scan_job_id ON pr_security_summary(pr_scan_job_id);
CREATE INDEX IF NOT EXISTS idx_github_webhooks_repository_id ON github_webhooks(repository_id);


