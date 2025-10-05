const githubService = require('../services/githubService');

async function testGitHubAPI() {
  try {
    console.log('🧪 Testing GitHub API connection...');
    
    // Test with a public repository using axios directly (no auth needed)
    const axios = require('axios');
    const response = await axios.get('https://api.github.com/repos/octocat/Hello-World');
    
    console.log('✅ GitHub API connection successful');
    console.log('Repository name:', response.data.name);
    console.log('Repository full name:', response.data.full_name);
    
  } catch (error) {
    console.error('❌ GitHub API test failed:', error.message);
  }
}

testGitHubAPI();
