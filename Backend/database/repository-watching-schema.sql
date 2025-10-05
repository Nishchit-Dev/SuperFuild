-- Repository Watching Schema
-- This schema handles repository monitoring and email notifications

-- Repository Watch Settings
CREATE TABLE IF NOT EXISTS repository_watches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    scan_on_open BOOLEAN DEFAULT TRUE,
    scan_on_sync BOOLEAN DEFAULT TRUE,
    scan_on_merge BOOLEAN DEFAULT FALSE,
    notification_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, repository_id)
);

-- Email Notification Queue
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pr_id INTEGER REFERENCES pull_requests(id) ON DELETE CASCADE,
    pr_scan_job_id INTEGER REFERENCES pr_scan_jobs(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL, -- 'pr_opened', 'scan_completed', 'scan_failed', 'vulnerability_found'
    email_to VARCHAR(255) NOT NULL,
    email_subject VARCHAR(500) NOT NULL,
    email_body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Configuration
CREATE TABLE IF NOT EXISTS email_config (
    id SERIAL PRIMARY KEY,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT FALSE,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repository_watches_user_id ON repository_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_repository_watches_repository_id ON repository_watches(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_watches_active ON repository_watches(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled ON email_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);

-- Insert default email templates
INSERT INTO email_templates (template_name, subject_template, body_template) VALUES
('pr_opened', 'New Pull Request: {{pr_title}} - {{repo_name}}', 
'<h2>New Pull Request Detected</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Author:</strong> {{pr_author}}</p>
<p><strong>URL:</strong> <a href="{{pr_url}}">{{pr_url}}</a></p>
<p>Security scanning will begin automatically...</p>'),

('scan_completed', 'Security Scan Completed: {{pr_title}} - {{repo_name}}',
'<h2>Security Scan Results</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Scan Status:</strong> {{scan_status}}</p>
<p><strong>Vulnerabilities Found:</strong> {{vulnerability_count}}</p>
<p><strong>Security Score:</strong> {{security_score}}/100</p>
<p><strong>Recommendation:</strong> {{recommendation}}</p>
<p><strong>View Results:</strong> <a href="{{results_url}}">View Detailed Results</a></p>'),

('vulnerability_found', 'Security Vulnerabilities Found: {{pr_title}} - {{repo_name}}',
'<h2>⚠️ Security Vulnerabilities Detected</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Critical Issues:</strong> {{critical_count}}</p>
<p><strong>High Issues:</strong> {{high_count}}</p>
<p><strong>Medium Issues:</strong> {{medium_count}}</p>
<p><strong>Security Score:</strong> {{security_score}}/100</p>
<p><strong>Recommendation:</strong> {{recommendation}}</p>
<p><strong>View Details:</strong> <a href="{{results_url}}">Review Vulnerabilities</a></p>'),

('scan_failed', 'Security Scan Failed: {{pr_title}} - {{repo_name}}',
'<h2>❌ Security Scan Failed</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Error:</strong> {{error_message}}</p>
<p>Please check the scan logs or try again.</p>')
ON CONFLICT (template_name) DO NOTHING;
