import { AIManager } from '../src/coordinator/core/AIManager.js';
import { AgentCoordinator } from '../src/coordinator/core/AgentCoordinator.js';
import { AISettings } from '../src/coordinator/types/index.js';

/**
 * Complete Example: Agent System Workflow
 * 
 * This example demonstrates:
 * 1. Setting up the AI Manager with agent coordination
 * 2. Registering specialized agents
 * 3. Processing user requests with automatic task delegation
 * 4. Receiving summarized results from multiple agents
 */

async function runAgentSystemExample() {
  console.log('🤖 Starting Agent System Example\n');

  // Step 1: Initialize AI Manager with OpenRouter
  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku',
    maxTokens: 2000,
    temperature: 0.3
  };

  const aiManager = new AIManager();
  await aiManager.initialize(aiSettings);

  // Step 2: Create and initialize Agent Coordinator
  const agentCoordinator = new AgentCoordinator(aiSettings);
  await agentCoordinator.initialize(aiSettings);

  // Step 3: Built-in agents are automatically registered during initialization
  console.log('📋 Built-in agents are automatically registered...');

  console.log('✅ Registered agents:', agentCoordinator.getAgentMetadata().map(a => a.name));

  // Step 4: Example user requests that will trigger agent delegation
  const exampleRequests = [
    {
      title: "Code Analysis Request",
      message: "Can you analyze this JavaScript code for security vulnerabilities and performance issues?\n\n```javascript\nfunction processUserInput(input) {\n  const query = 'SELECT * FROM users WHERE id = ' + input;\n  return database.execute(query);\n}\n```"
    },
    {
      title: "Simple Question (No Delegation)",
      message: "What is the capital of France?"
    },
    {
      title: "Complex Analysis Request",
      message: "I have this Python code that's running slowly. Can you analyze it for performance issues and suggest optimizations?\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\ndef process_data(data_list):\n    result = []\n    for item in data_list:\n        result.append(fibonacci(item))\n    return result\n```"
    }
  ];

  // Step 5: Process each request
  for (const request of exampleRequests) {
    console.log(`\n🔍 Processing: ${request.title}`);
    console.log(`📝 User Request: ${request.message.substring(0, 100)}...`);
    
    try {
      const startTime = Date.now();
      
      // Process message with agent coordination
      const result = await agentCoordinator.processMessageWithAgents(
        request.message,
        { maxTokens: 1500 },
        `conv_${Date.now()}`
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

  // Step 6: Show system status
  console.log('\n📊 System Status:');
  const status = agentCoordinator.getStatus();
  console.log(`- Registered Agents: ${status.agentCount}`);
  console.log(`- Available Task Types: ${status.availableTaskTypes.join(', ')}`);
  console.log(`- Coordinator Initialized: ${status.isInitialized}`);

  // Step 7: Cleanup
  console.log('\n🧹 Cleaning up...');
  await aiManager.destroy();
  console.log('✅ Example completed successfully!');
}

/**
 * Example: Direct Task Delegation
 * 
 * This shows how to directly delegate tasks to agents without going through
 * the AI coordinator's message processing
 */
async function directTaskDelegationExample() {
  console.log('\n🎯 Direct Task Delegation Example\n');

  const aiSettings: AISettings = {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku'
  };

  const agentCoordinator = new AgentCoordinator(aiSettings);
  await agentCoordinator.initialize(aiSettings);

  // Built-in agents are automatically registered during initialization

  // Create a task directly
  const task = {
    id: `task_${Date.now()}`,
    type: 'code_analysis',
    description: 'Analyze this code for security vulnerabilities',
    parameters: {
      code: `
function login(username, password) {
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  return db.execute(query);
}
      `,
      language: 'javascript',
      analysisType: 'security'
    },
    priority: 'high' as const,
    timeout: 30000
  };

  const context = {
    taskId: task.id,
    conversationId: 'direct_delegation_example',
    userContext: { source: 'direct_delegation' }
  };

  console.log('📋 Delegating task directly to code analysis agent...');
  console.log(`Task: ${task.description}`);
  
  const startTime = Date.now();
  const result = await agentCoordinator.delegateTask(task, context);
  const executionTime = Date.now() - startTime;

  console.log(`\n✅ Task completed in ${executionTime}ms`);
  console.log(`📊 Delegated to: ${result.delegatedTo.join(', ')}`);
  console.log(`📈 Total execution time: ${result.totalExecutionTime}ms`);
  console.log(`🔢 Total tokens used: ${result.totalTokensUsed}`);
  console.log(`💰 Total cost: $${result.totalCost.toFixed(4)}`);
  
  console.log('\n📝 Summary:');
  console.log(result.summary);

  console.log('\n🔍 Detailed Results:');
  result.results.forEach((agentResult, index) => {
    console.log(`\nAgent ${index + 1} (${agentResult.agentId}):`);
    console.log(`- Success: ${agentResult.success}`);
    console.log(`- Execution Time: ${agentResult.executionTime}ms`);
    if (agentResult.success) {
      console.log(`- Result: ${JSON.stringify(agentResult.result, null, 2)}`);
    } else {
      console.log(`- Error: ${agentResult.error}`);
    }
  });
}

// Run examples
async function main() {
  try {
    await runAgentSystemExample();
    await directTaskDelegationExample();
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runAgentSystemExample, directTaskDelegationExample }; 