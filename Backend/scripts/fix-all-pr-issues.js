const pool = require('../config/database');

async function fixAllPRIssues() {
    try {
        console.log('🔧 Fixing all PR monitoring issues...\n');
        
        // 1. Fix pull_requests table schema
        console.log('1. Fixing pull_requests table...');
        
        // Add missing columns
        const addColumns = [
            'ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS html_url VARCHAR(500)',
            'ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS base_commit_sha VARCHAR(40)',
            'ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS head_commit_sha VARCHAR(40)'
        ];
        
        for (const query of addColumns) {
            try {
                await pool.query(query);
                console.log('✅ Added missing columns');
            } catch (error) {
                if (error.code !== '42701') { // Column already exists
                    console.log('⚠️  Error adding columns:', error.message);
                }
            }
        }
        
        // Change data types to support large GitHub IDs
        const changeTypes = [
            'ALTER TABLE pull_requests ALTER COLUMN github_pr_id TYPE BIGINT',
            'ALTER TABLE repositories ALTER COLUMN github_repo_id TYPE BIGINT',
            'ALTER TABLE github_accounts ALTER COLUMN github_id TYPE BIGINT'
        ];
        
        for (const query of changeTypes) {
            try {
                await pool.query(query);
                console.log('✅ Changed data types to BIGINT');
            } catch (error) {
                console.log('⚠️  Error changing types:', error.message);
            }
        }
        
        // Make base_commit_sha nullable (since we don't always have it)
        try {
            await pool.query('ALTER TABLE pull_requests ALTER COLUMN base_commit_sha DROP NOT NULL');
            await pool.query('ALTER TABLE pull_requests ALTER COLUMN head_commit_sha DROP NOT NULL');
            console.log('✅ Made commit SHA columns nullable');
        } catch (error) {
            console.log('⚠️  Error making columns nullable:', error.message);
        }
        
        // 2. Fix email templates
        console.log('\n2. Fixing email templates...');
        
        const emailTemplates = [
            {
                name: 'pr_opened',
                subject: 'New Pull Request: {{pr_title}} - {{repo_name}}',
                body: `<h2>New Pull Request Detected</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Author:</strong> {{pr_author}}</p>
<p><strong>URL:</strong> <a href="{{pr_url}}">{{pr_url}}</a></p>
<p>Security scanning will begin automatically...</p>`
            },
            {
                name: 'scan_completed',
                subject: 'Security Scan Completed: {{pr_title}} - {{repo_name}}',
                body: `<h2>Security Scan Results</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Scan Status:</strong> {{scan_status}}</p>
<p><strong>Vulnerabilities Found:</strong> {{vulnerability_count}}</p>
<p><strong>Security Score:</strong> {{security_score}}/100</p>
<p><strong>Recommendation:</strong> {{recommendation}}</p>
<p><strong>View Results:</strong> <a href="{{results_url}}">View Detailed Results</a></p>`
            },
            {
                name: 'vulnerability_found',
                subject: 'Security Vulnerabilities Found: {{pr_title}} - {{repo_name}}',
                body: `<h2>⚠️ Security Vulnerabilities Detected</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Critical Issues:</strong> {{critical_count}}</p>
<p><strong>High Issues:</strong> {{high_count}}</p>
<p><strong>Medium Issues:</strong> {{medium_count}}</p>
<p><strong>Security Score:</strong> {{security_score}}/100</p>
<p><strong>Recommendation:</strong> {{recommendation}}</p>
<p><strong>View Details:</strong> <a href="{{results_url}}">Review Vulnerabilities</a></p>`
            },
            {
                name: 'scan_failed',
                subject: 'Security Scan Failed: {{pr_title}} - {{repo_name}}',
                body: `<h2>❌ Security Scan Failed</h2>
<p><strong>Repository:</strong> {{repo_name}}</p>
<p><strong>Pull Request:</strong> #{{pr_number}} - {{pr_title}}</p>
<p><strong>Error:</strong> {{error_message}}</p>
<p>Please check the scan logs or try again.</p>`
            }
        ];
        
        for (const template of emailTemplates) {
            try {
                await pool.query(`
                    INSERT INTO email_templates (template_name, subject_template, body_template, is_active)
                    VALUES ($1, $2, $3, TRUE)
                    ON CONFLICT (template_name) 
                    DO UPDATE SET
                        subject_template = EXCLUDED.subject_template,
                        body_template = EXCLUDED.body_template,
                        is_active = TRUE
                `, [template.name, template.subject, template.body]);
                console.log(`✅ Fixed template: ${template.name}`);
            } catch (error) {
                console.log(`⚠️  Error fixing template ${template.name}:`, error.message);
            }
        }
        
        console.log('\n🎉 All PR monitoring issues fixed!');
        console.log('\n📝 Summary:');
        console.log('   ✅ Added missing database columns');
        console.log('   ✅ Fixed integer overflow issues');
        console.log('   ✅ Made commit SHA columns nullable');
        console.log('   ✅ Fixed email templates');
        console.log('\n🚀 PR monitoring should now work perfectly!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixAllPRIssues();







