const prMonitoringService = require('../services/prMonitoringService');

async function testPRMonitoring() {
    try {
        console.log('🧪 Testing PR monitoring service...\n');
        
        // Start the service
        prMonitoringService.start();
        
        // Wait a bit for it to run
        console.log('⏳ Waiting for monitoring to run...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get status
        const status = prMonitoringService.getStatus();
        console.log('📊 Monitoring Status:', status);
        
        // Stop the service
        prMonitoringService.stop();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPRMonitoring();







