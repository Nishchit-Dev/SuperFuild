require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    console.log('🧪 Testing Gemini AI connection...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ GEMINI_API_KEY environment variable is not set');
      console.log('Please set your Gemini API key in the .env file');
      return;
    }
    
    console.log('✅ GEMINI_API_KEY is set');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test with the correct model name
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const result = await model.generateContent('Hello, can you respond with "AI is working"?');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini AI is working!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('❌ Gemini AI test failed:', error.message);
    
    if (error.message.includes('404')) {
      console.log('💡 Try using a different model name like: gemini-1.5-flash-001');
    } else if (error.message.includes('API key')) {
      console.log('💡 Check your GEMINI_API_KEY in the .env file');
    }
  }
}

testGemini();
