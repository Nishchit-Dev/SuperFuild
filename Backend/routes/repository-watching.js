const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const repositoryWatchService = require('../services/repositoryWatchService');
const emailService = require('../services/emailService');

// Get watched repositories for current user
router.get('/watches', authenticateToken, async (req, res) => {
    try {
        const watches = await repositoryWatchService.getWatchedRepositories(req.user.id);
        res.json({ watches });
    } catch (error) {
        console.error('Get watches error:', error);
        res.status(500).json({ error: 'Failed to get watched repositories' });
    }
});

// Add repository to watch list
router.post('/watches', authenticateToken, async (req, res) => {
    try {
        const { repositoryId, settings = {} } = req.body;
        
        if (!repositoryId) {
            return res.status(400).json({ error: 'Repository ID is required' });
        }

        await repositoryWatchService.addRepositoryWatch(req.user.id, repositoryId, settings);
        res.json({ message: 'Repository added to watch list' });
    } catch (error) {
        console.error('Add watch error:', error);
        res.status(500).json({ error: error.message || 'Failed to add repository to watch list' });
    }
});

// Remove repository from watch list
router.delete('/watches/:repositoryId', authenticateToken, async (req, res) => {
    try {
        const { repositoryId } = req.params;
        
        const success = await repositoryWatchService.removeRepositoryWatch(req.user.id, repositoryId);
        
        if (success) {
            res.json({ message: 'Repository removed from watch list' });
        } else {
            res.status(404).json({ error: 'Repository watch not found' });
        }
    } catch (error) {
        console.error('Remove watch error:', error);
        res.status(500).json({ error: 'Failed to remove repository from watch list' });
    }
});

// Update watch settings
router.put('/watches/:repositoryId', authenticateToken, async (req, res) => {
    try {
        const { repositoryId } = req.params;
        const settings = req.body;
        
        const success = await repositoryWatchService.updateWatchSettings(req.user.id, repositoryId, settings);
        
        if (success) {
            res.json({ message: 'Watch settings updated' });
        } else {
            res.status(404).json({ error: 'Repository watch not found' });
        }
    } catch (error) {
        console.error('Update watch settings error:', error);
        res.status(500).json({ error: 'Failed to update watch settings' });
    }
});

// Get email notification statistics
router.get('/notifications/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await emailService.getNotificationStats(req.user.id);
        res.json({ stats });
    } catch (error) {
        console.error('Get notification stats error:', error);
        res.status(500).json({ error: 'Failed to get notification statistics' });
    }
});

// Test email configuration
router.post('/test-email', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        const success = await emailService.sendEmail(
            email,
            'AISecure - Test Email',
            '<h2>Test Email</h2><p>This is a test email from AISecure to verify your email configuration.</p>',
            'Test Email - This is a test email from AISecure to verify your email configuration.'
        );

        if (success) {
            res.json({ message: 'Test email sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send test email' });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

// Process pending email notifications (admin endpoint)
router.post('/process-notifications', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (you might want to add admin role checking)
        const processedCount = await emailService.processPendingNotifications();
        res.json({ 
            message: `Processed ${processedCount} pending notifications`,
            processedCount 
        });
    } catch (error) {
        console.error('Process notifications error:', error);
        res.status(500).json({ error: 'Failed to process notifications' });
    }
});

// Get email templates
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const query = 'SELECT template_name, subject_template, body_template FROM email_templates WHERE is_active = TRUE';
        const result = await pool.query(query);
        res.json({ templates: result.rows });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to get email templates' });
    }
});

// Get PR monitoring status
router.get('/monitoring/status', authenticateToken, async (req, res) => {
    try {
        const prMonitoringService = require('../services/prMonitoringService');
        const status = prMonitoringService.getStatus();
        res.json({ status });
    } catch (error) {
        console.error('Get monitoring status error:', error);
        res.status(500).json({ error: 'Failed to get monitoring status' });
    }
});

// Manually trigger PR check
router.post('/monitoring/check', authenticateToken, async (req, res) => {
    try {
        const prMonitoringService = require('../services/prMonitoringService');
        await prMonitoringService.checkForNewPRs();
        res.json({ message: 'PR check completed' });
    } catch (error) {
        console.error('Manual PR check error:', error);
        res.status(500).json({ error: 'Failed to check for new PRs' });
    }
});

module.exports = router;
