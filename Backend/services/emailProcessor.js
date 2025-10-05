const emailService = require('./emailService');

class EmailProcessor {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.processingInterval = 30000; // 30 seconds
    }

    // Start the email processor
    start() {
        if (this.isRunning) {
            console.log('Email processor is already running');
            return;
        }

        console.log('Starting email processor...');
        this.isRunning = true;
        
        // Initialize email service
        emailService.initialize().then((initialized) => {
            if (initialized) {
                console.log('Email service initialized successfully');
            } else {
                console.log('Email service not configured, notifications will be queued only');
            }
        });

        // Process emails immediately
        this.processEmails();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.processEmails();
        }, this.processingInterval);

        console.log(`Email processor started (checking every ${this.processingInterval / 1000} seconds)`);
    }

    // Stop the email processor
    stop() {
        if (!this.isRunning) {
            console.log('Email processor is not running');
            return;
        }

        console.log('Stopping email processor...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('Email processor stopped');
    }

    // Process pending emails
    async processEmails() {
        try {
            const processedCount = await emailService.processPendingNotifications();
            if (processedCount > 0) {
                console.log(`Processed ${processedCount} email notifications`);
            }
        } catch (error) {
            console.error('Error processing emails:', error);
        }
    }

    // Get processor status
    getStatus() {
        return {
            isRunning: this.isRunning,
            processingInterval: this.processingInterval,
            nextProcessTime: this.isRunning ? new Date(Date.now() + this.processingInterval) : null
        };
    }

    // Update processing interval
    setInterval(interval) {
        this.processingInterval = interval;
        
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
}

// Create singleton instance
const emailProcessor = new EmailProcessor();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down email processor...');
    emailProcessor.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down email processor...');
    emailProcessor.stop();
    process.exit(0);
});

module.exports = emailProcessor;
