import { AIManager } from '../src/coordinator/core/AIManager.js';
import { AISettings } from '../src/coordinator/types/index.js';

/**
 * Example: Using AIManager with Agent Coordination
 * 
 * This example demonstrates how the AIManager now automatically
 * uses agent coordination for all messages, enabling intelligent
 * task delegation to specialized agents.
 */

async function demonstrateAIManagerWithAgents() {
  console.log('🤖 AIManager with Agent Coordination Example\n');

  // Step 1: Initialize AI Manager with OpenRouter
  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku',
    maxTokens: 2000,
    temperature: 0.3
  };

  const aiManager = new AIManager();
  await aiManager.initialize(aiSettings);

  // Step 2: Built-in agents are automatically registered during initialization
  console.log('📋 Built-in agents are automatically registered...');

  console.log('✅ Registered agents:', aiManager.getAgentMetadata().map(a => a.name));

  // Step 3: Example user requests that will trigger agent delegation
  const exampleRequests = [
    {
      title: "Code Analysis Request",
      message: "Can you analyze this JavaScript code for security vulnerabilities?\n\n```javascript\nfunction processUserInput(input) {\n  const query = 'SELECT * FROM users WHERE id = ' + input;\n  return database.execute(query);\n}\n```"
    },
    {
      title: "Simple Question (No Delegation)",
      message: "What is the capital of France?"
    },
    {
      title: "Performance Analysis Request",
      message: "I have this Python code that's running slowly. Can you analyze it for performance issues?\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\ndef process_data(data_list):\n    result = []\n    for item in data_list:\n        result.append(fibonacci(item))\n    return result\n```"
    }
  ];

  // Step 4: Process each request using the standard AIManager interface
  for (const request of exampleRequests) {
    console.log(`\n🔍 Processing: ${request.title}`);
    console.log(`📝 User Request: ${request.message.substring(0, 100)}...`);
    
    try {
      const startTime = Date.now();
      
      // Use the standard AIManager.sendMessage() - now with agent coordination!
      const result = await aiManager.sendMessage(
        request.message,
        { maxTokens: 1500 }
      );

      const processingTime = Date.now() - startTime;
      
      console.log(`⏱️  Processing Time: ${processingTime}ms`);
      console.log(`🤖 AI Response:\n${result.message.content}\n`);
      
      if (result.usage) {
        console.log(`📊 Token Usage: ${result.usage.totalTokens} tokens`);
      }

    } catch (error) {
      console.error(`❌ Error processing request:`, error);
    }
  }

  // Step 5: Show system status and agent information
  console.log('\n📊 System Status:');
  console.log('- AI Manager Status:', aiManager.getStatus());
  console.log('- Connection Status:', aiManager.isConnected());
  
  const usageStats = await aiManager.getUsageStats();
  console.log('- Total Tokens Used:', usageStats.totalTokens);
  console.log('- Total Requests:', usageStats.requests);

  console.log('\n🤖 Agent Information:');
  const agents = aiManager.getAllAgents();
  console.log('- Total Agents:', agents.length);
  
  agents.forEach(agent => {
    const metadata = agent.getMetadata();
    console.log(`  - ${metadata.name} (${metadata.id}): ${metadata.description}`);
    console.log(`    Supported Tasks: ${metadata.supportedTaskTypes.join(', ')}`);
  });

  // Step 6: Demonstrate conversation continuity
  console.log('\n💬 Testing Conversation Continuity...');
  
  const conversationId = (await aiManager.createConversation()).id;
  
  const response1 = await aiManager.sendMessage(
    "Can you analyze this code for security issues?",
    { conversationId }
  );
  console.log('First response length:', response1.message.content.length);
  
  const response2 = await aiManager.sendMessage(
    "What about performance issues in the same code?",
    { conversationId }
  );
  console.log('Second response length:', response2.message.content.length);
  
  const conversation = await aiManager.getConversation(conversationId);
  console.log('Conversation message count:', conversation?.messages.length || 0);

  // Step 7: Cleanup
  console.log('\n🧹 Cleaning up...');
  await aiManager.destroy();
  console.log('✅ Example completed successfully!');
}

/**
 * Example: Direct Agent Management
 * 
 * This shows how to directly manage agents through the AIManager
 */
async function demonstrateAgentManagement() {
  console.log('\n🎯 Agent Management Example\n');

  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku'
  };

  const aiManager = new AIManager();
  await aiManager.initialize(aiSettings);

  // Built-in agents are automatically registered during initialization

  console.log('📋 Agent Metadata:');
  const agentMetadata = aiManager.getAgentMetadata();
  agentMetadata.forEach(agent => {
    console.log(`- ${agent.name} (${agent.id})`);
    console.log(`  Description: ${agent.description}`);
    console.log(`  Version: ${agent.version}`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`  Supported Tasks: ${agent.supportedTaskTypes.join(', ')}`);
    console.log(`  Tags: ${agent.tags.join(', ')}`);
  });

  // Test agent health
  console.log('\n🏥 Agent Health Check:');
  const agents = aiManager.getAllAgents();
  for (const agent of agents) {
    const health = await agent.getHealth();
    console.log(`- ${agent.getMetadata().name}: ${health.status} (${health.details || 'No issues'})`);
  }

  // Unregister an agent
  console.log('\n🗑️  Unregistering agent...');
  aiManager.unregisterAgent('code-analysis-agent');
  console.log('Remaining agents:', aiManager.getAllAgents().length);

  await aiManager.destroy();
  console.log('✅ Agent management example completed!');
}

// Run examples
async function main() {
  try {
    await demonstrateAIManagerWithAgents();
    await demonstrateAgentManagement();
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { demonstrateAIManagerWithAgents, demonstrateAgentManagement }; 