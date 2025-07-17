import { AIManager } from '../src/coordinator/core/AIManager.js';
import { AISettings, AIMessage } from '../src/coordinator/types/index.js';

/**
 * Example: Real-time Status Updates During Agent Coordination
 * 
 * This example demonstrates how the system provides real-time
 * status updates during the agent coordination process.
 */

async function demonstrateStatusUpdates() {
  console.log('📡 Status Updates Example\n');

  // Initialize AI Manager
  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku',
    maxTokens: 2000,
    temperature: 0.3
  };

  const aiManager = new AIManager();
  await aiManager.initialize(aiSettings);

  // Built-in agents (like CodeAnalysisAgent) are automatically registered during initialization

  console.log('✅ Registered agents:', aiManager.getAgentMetadata().map(a => a.name));

  // Set up event listener for status updates
  const statusMessages: AIMessage[] = [];
  
  aiManager.on('onMessageReceived', (message: AIMessage, conversationId: string) => {
    const timestamp = message.timestamp.toLocaleTimeString();
    console.log(`[${timestamp}] ${message.content}`);
    statusMessages.push(message);
  });

  // Test with a request that will trigger agent delegation
  const testRequest = `Can you analyze this JavaScript code for security vulnerabilities and performance issues?

\`\`\`javascript
function processUserInput(input) {
  const query = 'SELECT * FROM users WHERE id = ' + input;
  return database.execute(query);
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
\`\`\``;

  console.log('🔍 Processing request with real-time status updates:\n');
  console.log('📝 User Request:', testRequest.substring(0, 100) + '...\n');

  try {
    const startTime = Date.now();
    
    const result = await aiManager.sendMessage(testRequest, {
      maxTokens: 1500
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`\n⏱️  Total Processing Time: ${processingTime}ms`);
    console.log(`📊 Status Messages Received: ${statusMessages.length}`);
    
    console.log('\n📋 Status Update Summary:');
    statusMessages.forEach((msg, index) => {
      const timestamp = msg.timestamp.toLocaleTimeString();
      console.log(`${index + 1}. [${timestamp}] ${msg.content}`);
    });

    console.log('\n🤖 Final Response:');
    console.log(result.message.content);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test with a simple request (no delegation)
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Simple Request (No Agent Delegation)\n');

  const simpleRequest = "What is the capital of France?";
  console.log('📝 User Request:', simpleRequest);

  // Clear previous status messages
  statusMessages.length = 0;

  try {
    const result = await aiManager.sendMessage(simpleRequest);
    
    console.log('\n📋 Status Update Summary:');
    statusMessages.forEach((msg, index) => {
      const timestamp = msg.timestamp.toLocaleTimeString();
      console.log(`${index + 1}. [${timestamp}] ${msg.content}`);
    });

    console.log('\n🤖 Final Response:');
    console.log(result.message.content);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Cleanup
  await aiManager.destroy();
  console.log('\n✅ Status updates example completed!');
}

/**
 * Example: Conversation with Status Updates
 * 
 * Demonstrates how status updates work in a conversation context
 */
async function demonstrateConversationStatusUpdates() {
  console.log('\n💬 Conversation Status Updates Example\n');

  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku'
  };

  const aiManager = new AIManager();
  await aiManager.initialize(aiSettings);

  // Built-in agents (like CodeAnalysisAgent) are automatically registered during initialization

  // Create conversation
  const conversation = await aiManager.createConversation();
  console.log('💬 Created conversation:', conversation.id);

  // Set up event listener
  aiManager.on('onMessageReceived', (message: AIMessage, conversationId: string) => {
    const timestamp = message.timestamp.toLocaleTimeString();
    console.log(`[${timestamp}] ${message.content}`);
  });

  // First message - should trigger agent delegation
  console.log('\n📝 Message 1: Code analysis request');
  const response1 = await aiManager.sendMessage(
    "Can you analyze this code for security issues?\n\n```javascript\nfunction login(user, pass) {\n  return db.query('SELECT * FROM users WHERE user=' + user + ' AND pass=' + pass);\n}\n```",
    { conversationId: conversation.id }
  );

  console.log('\n📝 Message 2: Follow-up question');
  const response2 = await aiManager.sendMessage(
    "What about performance optimization for the same code?",
    { conversationId: conversation.id }
  );

  console.log('\n📝 Message 3: Simple question (no delegation)');
  const response3 = await aiManager.sendMessage(
    "What's the weather like?",
    { conversationId: conversation.id }
  );

  // Show conversation summary
  const finalConversation = await aiManager.getConversation(conversation.id);
  console.log(`\n📊 Conversation Summary:`);
  console.log(`- Total Messages: ${finalConversation?.messages.length || 0}`);
  console.log(`- Conversation ID: ${conversation.id}`);

  await aiManager.destroy();
  console.log('\n✅ Conversation status updates example completed!');
}

// Run examples
async function main() {
  try {
    await demonstrateStatusUpdates();
    await demonstrateConversationStatusUpdates();
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { demonstrateStatusUpdates, demonstrateConversationStatusUpdates }; 