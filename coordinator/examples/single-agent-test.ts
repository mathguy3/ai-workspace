import { AgentCoordinator } from '../src/coordinator/core/AgentCoordinator.js';
import { AISettings } from '../src/coordinator/types/index.js';

/**
 * Simple test demonstrating single-agent task delegation
 */
async function testSingleAgentDelegation() {
  console.log('🧪 Testing Single Agent Delegation\n');

  // Initialize with mock settings (no actual API calls)
  const aiSettings: AISettings = {
    apiKey: 'test-key',
    defaultModel: 'anthropic/claude-3-haiku'
  };

  const agentCoordinator = new AgentCoordinator(aiSettings);
  await agentCoordinator.initialize(aiSettings);
  
  // Built-in agents are automatically registered during initialization

  console.log('📋 Registered agents:', agentCoordinator.getAgentMetadata().map(a => a.name));

  // Test the MCP tool definition
  const mcpTool = agentCoordinator.getMCPTool();
  const toolDefinition = mcpTool.getToolDefinition();
  
  console.log('\n🔧 MCP Tool Definition:');
  console.log('Tool Name:', toolDefinition.function.name);
  console.log('Description:', toolDefinition.function.description);
  console.log('Required Parameters:', toolDefinition.function.parameters.required);
  console.log('Available Agent IDs:', toolDefinition.function.parameters.properties.agentId.enum);

  // Test agent capabilities
  const availableTaskTypes = mcpTool.getAvailableTaskTypes();
  console.log('\n📝 Available Task Types:', availableTaskTypes);

  // Test agent capabilities for code analysis
  const codeAnalysisCapabilities = mcpTool.getAgentCapabilitiesForTaskType('code_analysis');
  console.log('\n🔍 Code Analysis Agent Capabilities:');
  codeAnalysisCapabilities.forEach(agent => {
    console.log(`- ${agent.agentName} (${agent.agentId}):`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`  Tags: ${agent.tags.join(', ')}`);
  });

  // Test system status
  const status = agentCoordinator.getStatus();
  console.log('\n📊 System Status:');
  console.log('- Agent Count:', status.agentCount);
  console.log('- Available Task Types:', status.availableTaskTypes);
  console.log('- Coordinator Initialized:', status.isInitialized);

  console.log('\n✅ Single agent delegation test completed successfully!');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSingleAgentDelegation().catch(console.error);
}

export { testSingleAgentDelegation }; 