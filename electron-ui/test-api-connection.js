// Simple test script to verify API client connection
// Run with: node test-api-connection.js

const fetch = require('node-fetch');

async function testAPIConnection() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing API connection...');
  console.log('Base URL:', baseUrl);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }
    
    // Test status endpoint
    console.log('\n2. Testing status endpoint...');
    const statusResponse = await fetch(`${baseUrl}/api/v1/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status check passed:', statusData);
    } else {
      console.log('❌ Status check failed:', statusResponse.status, statusResponse.statusText);
    }
    
    // Test models endpoint
    console.log('\n3. Testing models endpoint...');
    const modelsResponse = await fetch(`${baseUrl}/api/v1/models`);
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('✅ Models check passed:', modelsData.models?.length || 0, 'models available');
    } else {
      console.log('❌ Models check failed:', modelsResponse.status, modelsResponse.statusText);
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure the API server is running on http://localhost:3000');
    console.log('💡 You can start it with: bun run api:dev');
  }
}

// Run the test
testAPIConnection(); 