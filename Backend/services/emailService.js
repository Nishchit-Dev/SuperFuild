const nodemailer = require('nodemailer');
const pool = require('../config/database');

class EmailService {
    constructor() {
        this.transporter = null;
        this.config = null;
    }

    // Initialize email configuration
    async initialize() {
        try {
            const configQuery = 'SELECT * FROM email_config WHERE is_active = TRUE LIMIT 1';
            const result = await pool.query(configQuery);
            
            if (result.rows.length === 0) {
                console.log('No email configuration found. Email notifications disabled.');
                return false;
            }

            this.config = result.rows[0];
            
            this.transporter = nodemailer.createTransport({
                host: this.config.smtp_host,
                port: this.config.smtp_port,
                secure: this.config.smtp_secure,
                auth: {
                    user: this.config.smtp_user,
                    pass: this.config.smtp_password
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('Email service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize email service:', error);
            return false;
        }
    }

    // Get email template
    async getTemplate(templateName) {
        try {
            const query = 'SELECT * FROM email_templates WHERE template_name = $1 AND is_active = TRUE';
            const result = await pool.query(query, [templateName]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Failed to get email template:', error);
            return null;
        }
    }

    // Replace template variables
    replaceTemplateVariables(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result;
    }

    // Send email notification
    async sendEmail(to, subject, htmlBody, textBody = null) {
        if (!this.transporter) {
            console.log('Email service not initialized. Skipping email send.');
            return false;
        }

        try {
            const mailOptions = {
                from: `"${this.config.from_name}" <${this.config.from_email}>`,
                to: to,
                subject: subject,
                html: htmlBody,
                text: textBody || this.htmlToText(htmlBody)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            return false;
        }
    }

    // Convert HTML to plain text
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    // Queue email notification
    async queueNotification(userId, repositoryId, prId, prScanJobId, notificationType, emailTo, variables = {}) {
        try {
            const template = await this.getTemplate(notificationType);
            if (!template) {
                console.error(`Email template not found: ${notificationType}`);
                return false;
            }

            const subject = this.replaceTemplateVariables(template.subject_template, variables);
            const body = this.replaceTemplateVariables(template.body_template, variables);

            const query = `
                INSERT INTO email_notifications 
                (user_id, repository_id, pull_request_id, template_name, recipient_email, subject, content)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            await pool.query(query, [
                userId,
                repositoryId,
                prId,
                notificationType,
                emailTo,
                subject,
                body
            ]);

            console.log(`Email notification queued: ${notificationType} for user ${userId}`);
            return true;
        } catch (error) {
            console.error('Failed to queue email notification:', error);
            return false;
        }
    }

    // Process pending email notifications
    async processPendingNotifications() {
        try {
            const query = `
                SELECT * FROM email_notifications 
                WHERE status = 'pending' 
                AND scheduled_at <= NOW() 
                AND attempts < max_attempts
                ORDER BY created_at ASC
                LIMIT 10
            `;

            const result = await pool.query(query);
            const notifications = result.rows;

            for (const notification of notifications) {
                await this.processNotification(notification);
            }

            return notifications.length;
        } catch (error) {
            console.error('Failed to process pending notifications:', error);
            return 0;
        }
    }

    // Process individual notification
    async processNotification(notification) {
        try {
            // Update attempt count
            const updateQuery = `
                UPDATE email_notifications 
                SET attempts = attempts + 1 
                WHERE id = $1
            `;
            await pool.query(updateQuery, [notification.id]);

            // Send email
            const success = await this.sendEmail(
                notification.recipient_email,
                notification.subject,
                notification.content
            );

            if (success) {
                // Mark as sent
                const successQuery = `
                    UPDATE email_notifications 
                    SET status = 'sent', sent_at = NOW() 
                    WHERE id = $1
                `;
                await pool.query(successQuery, [notification.id]);
                console.log(`Email notification sent: ${notification.id}`);
            } else {
                // Mark as failed if max attempts reached
                if (notification.attempts + 1 >= notification.max_attempts) {
                    const failQuery = `
                        UPDATE email_notifications 
                        SET status = 'failed', error_message = 'Max attempts reached' 
                        WHERE id = $1
                    `;
                    await pool.query(failQuery, [notification.id]);
                    console.log(`Email notification failed: ${notification.id}`);
                }
            }
        } catch (error) {
            console.error(`Failed to process notification ${notification.id}:`, error);
        }
    }

    // Get notification statistics
    async getNotificationStats(userId = null) {
        try {
            let query = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM email_notifications
            `;
            const params = [];

            if (userId) {
                query += ' WHERE user_id = $1';
                params.push(userId);
            }

            query += ' GROUP BY status';

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Failed to get notification stats:', error);
            return [];
        }
    }
}

module.exports = new EmailService();
