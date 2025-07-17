import { AIManager, AISettings } from '../src/coordinator';

async function basicExample() {
  // Create AI Manager instance
  const aiManager = new AIManager();

  // Configure settings
  const settings: AISettings = {
    apiKey: (globalThis as any).process?.env?.OPENROUTER_API_KEY || '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',
    defaultModel: 'mistralai/devstral-medium',
    maxTokens: 3000,
    temperature: 0.7
  };

  try {
    // Initialize the manager
    console.log('Initializing AI Manager...');
    await aiManager.initialize(settings);
    console.log('✅ AI Manager initialized successfully');

    // Set up event listeners
    aiManager.on('onStatusChanged', (status, details) => {
      console.log(`🔄 Status: ${status}${details ? ` - ${details}` : ''}`);
    });

    aiManager.on('onMessageReceived', (message) => {
      console.log(`🤖 AI: ${message.content}`);
    });

    aiManager.on('onError', (error) => {
      console.error(`❌ Error: ${error.message}`);
    });

    // Get available models
    console.log('\n📋 Fetching available models...');
    const models = await aiManager.getAvailableModels();
    console.log(`Found ${models.length} models available`);

    // Send a message
    console.log('\n💬 Sending message...');
    const result = await aiManager.sendMessage('Hello! Can you tell me a short joke?');
    console.log(`✅ Message sent successfully`);

    // Continue the conversation
    console.log('\n💬 Continuing conversation...');
    const result2 = await aiManager.sendMessage('That was funny! Can you tell me another one?', {
      conversationId: result.conversationId
    });

    // Get usage statistics
    console.log('\n📊 Usage Statistics:');
    const stats = await aiManager.getUsageStats();
    console.log(`Total tokens: ${stats.totalTokens}`);
    console.log(`Total requests: ${stats.requests}`);
    console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);

    // List conversations
    console.log('\n💭 Conversations:');
    const conversations = await aiManager.listConversations();
    conversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.id} (${conv.messages.length} messages)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await aiManager.destroy();
    console.log('✅ Cleanup complete');
  }
}

// Run the example
basicExample().catch(console.error); 