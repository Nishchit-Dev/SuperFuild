# Repository Watching & Email Notifications

This module provides automatic monitoring of GitHub repositories for new pull requests and sends email notifications with security scan results.

## Features

- **Automatic PR Monitoring**: Watch repositories for new pull requests
- **Email Notifications**: Send detailed security scan results via email
- **Configurable Settings**: Customize notification preferences per repository
- **Background Processing**: Queue-based email system with retry logic
- **Template System**: Customizable email templates for different notification types

## Architecture

### Database Schema

- `repository_watches`: User repository watch settings
- `email_notifications`: Email queue with retry logic
- `email_templates`: Customizable email templates
- `email_config`: SMTP configuration

### Services

- `emailService.js`: Core email functionality with SMTP
- `repositoryWatchService.js`: Repository monitoring logic
- `emailProcessor.js`: Background email processing

### API Endpoints

- `GET /api/watching/watches` - Get watched repositories
- `POST /api/watching/watches` - Add repository to watch
- `DELETE /api/watching/watches/:id` - Remove repository from watch
- `PUT /api/watching/watches/:id` - Update watch settings
- `POST /api/watching/test-email` - Test email configuration

## Setup

### 1. Install Dependencies

```bash
npm install nodemailer
```

### 2. Apply Database Schema

```bash
node scripts/apply-repository-watching-schema.js
```

### 3. Configure Email Settings

```bash
node scripts/setup-email-config.js
```

### 4. Start the Server

```bash
npm start
```

The email processor starts automatically with the server.

## Email Configuration

The system supports any SMTP provider:

- **Gmail**: smtp.gmail.com:587
- **Outlook**: smtp-mail.outlook.com:587
- **SendGrid**: smtp.sendgrid.net:587
- **Custom SMTP**: Any SMTP server

### Gmail Setup

1. Enable 2-factor authentication
2. Generate an app password
3. Use your Gmail address and app password

## Usage

### Adding a Repository to Watch

```javascript
const response = await fetch('/api/watching/watches', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repositoryId: 123,
    settings: {
      emailNotifications: true,
      scanOnOpen: true,
      scanOnSync: true,
      scanOnMerge: false,
      notificationEmail: 'user@example.com'
    }
  })
});
```

### Getting Watched Repositories

```javascript
const response = await fetch('/api/watching/watches', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { watches } = await response.json();
```

## Email Templates

The system includes pre-built templates:

- `pr_opened`: New PR detected
- `scan_completed`: Scan finished successfully
- `vulnerability_found`: Security issues detected
- `scan_failed`: Scan encountered errors

### Template Variables

- `{{pr_title}}` - Pull request title
- `{{pr_number}}` - Pull request number
- `{{pr_author}}` - PR author
- `{{pr_url}}` - GitHub PR URL
- `{{repo_name}}` - Repository name
- `{{vulnerability_count}}` - Number of vulnerabilities
- `{{security_score}}` - Security score (0-100)
- `{{recommendation}}` - Scan recommendation

## Background Processing

The email processor runs every 30 seconds and:

1. Fetches pending notifications
2. Sends emails via SMTP
3. Updates notification status
4. Retries failed emails (up to 3 attempts)

## Monitoring

### Check Email Processor Status

```javascript
const emailProcessor = require('./services/emailProcessor');
console.log(emailProcessor.getStatus());
```

### View Notification Statistics

```javascript
const response = await fetch('/api/watching/notifications/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { stats } = await response.json();
```

## Integration with PR Scanning

The repository watching system integrates with the existing PR scanning:

1. **PR Opened**: Automatically triggers scan if enabled
2. **Scan Completed**: Sends results via email
3. **Scan Failed**: Notifies user of errors

## Security Considerations

- Email credentials are stored encrypted in the database
- SMTP connections use TLS/SSL
- Failed email attempts are logged
- User authentication required for all operations

## Troubleshooting

### Email Not Sending

1. Check SMTP configuration
2. Verify email credentials
3. Check firewall settings
4. Review email processor logs

### Notifications Not Triggering

1. Verify repository watch is active
2. Check GitHub webhook configuration
3. Review scan job status
4. Check email queue status

## Future Enhancements

- Webhook integration for real-time notifications
- Slack/Discord notifications
- Custom notification schedules
- Email template editor UI
- Notification analytics dashboard
