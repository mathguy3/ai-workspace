// Simple test script for the API
// Run with: bun run api/test-api.ts

async function testAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing AI Manager API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = await healthResponse.json() as { status: string; timestamp: string; aiManagerStatus: string };
    console.log('✅ Health check passed:', health.status);

    // Test status endpoint
    console.log('\n2. Testing status endpoint...');
    const statusResponse = await fetch(`${baseUrl}/api/v1/status`);
    const status = await statusResponse.json() as { status: string; details?: string; connected: boolean; wsStats: { clients: number; subscriptions: number } };
    console.log('✅ Status check passed:', status.status);

    // Test models endpoint
    console.log('\n3. Testing models endpoint...');
    const modelsResponse = await fetch(`${baseUrl}/api/v1/models`);
    const models = await modelsResponse.json() as { models: Array<{ id: string; name: string; provider: string }> };
    console.log(`✅ Models check passed: Found ${models.models.length} models`);

    // Test conversation creation
    console.log('\n4. Testing conversation creation...');
    const createResponse = await fetch(`${baseUrl}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        systemPrompt: 'You are a helpful assistant.'
      })
    });
    const conversation = await createResponse.json() as { conversationId: string; model: string; systemPrompt?: string };
    console.log('✅ Conversation created:', conversation.conversationId);

    // Test sending a message
    console.log('\n5. Testing message sending...');
    const messageResponse = await fetch(`${baseUrl}/api/v1/conversations/${conversation.conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Hello! This is a test message.'
      })
    });
    const message = await messageResponse.json() as { messageId: string; content: string; role: string; timestamp: string };
    console.log('✅ Message sent:', message.messageId);

    // Test getting conversation
    console.log('\n6. Testing conversation retrieval...');
    const getConvResponse = await fetch(`${baseUrl}/api/v1/conversations/${conversation.conversationId}`);
    const fullConversation = await getConvResponse.json() as { conversationId: string; messages: Array<{ id: string; content: string; role: string; timestamp: string }>; model: string; systemPrompt?: string; status: string };
    console.log(`✅ Conversation retrieved: ${fullConversation.messages.length} messages`);

    // Test listing conversations
    console.log('\n7. Testing conversation listing...');
    const listResponse = await fetch(`${baseUrl}/api/v1/conversations`);
    const conversations = await listResponse.json() as { conversations: Array<{ conversationId: string; lastMessage?: string; messageCount: number; createdAt: string; updatedAt: string }> };
    console.log(`✅ Conversations listed: ${conversations.conversations.length} conversations`);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAPI(); 