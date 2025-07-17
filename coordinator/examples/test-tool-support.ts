import { AIManager, AISettings } from '../src/index.js';

async function testToolSupport() {
  const aiManager = new AIManager();

  const settings: AISettings = {
    apiKey: (globalThis as any).process?.env?.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'openai/gpt-4',
    maxTokens: 1000,
    temperature: 0.7
  };

  try {
    console.log('🔧 Testing tool support detection...');
    await aiManager.initialize(settings);

    // Get available models
    const models = await aiManager.getAvailableModels();
    
    // Find models that support tools
    const toolSupportingModels = models.filter(model => model.supportsTools);
    const nonToolModels = models.filter(model => !model.supportsTools);

    console.log(`\n📊 Tool Support Analysis:`);
    console.log(`Total models: ${models.length}`);
    console.log(`Models with tool support: ${toolSupportingModels.length}`);
    console.log(`Models without tool support: ${nonToolModels.length}`);

    // Show some examples of tool-supporting models
    console.log(`\n🛠️  Examples of models with tool support:`);
    toolSupportingModels.slice(0, 5).forEach(model => {
      console.log(`  • ${model.name} (${model.id})`);
      console.log(`    Capabilities: ${model.capabilities?.join(', ') || 'None'}`);
    });

    // Show some examples of models without tool support
    console.log(`\n❌ Examples of models without tool support:`);
    nonToolModels.slice(0, 5).forEach(model => {
      console.log(`  • ${model.name} (${model.id})`);
      console.log(`    Capabilities: ${model.capabilities?.join(', ') || 'None'}`);
    });

    // Test filtering by capabilities
    console.log(`\n🔍 Testing capability filtering:`);
    const modelsWithTools = await aiManager.filterModels({
      capabilities: ['tools']
    });
    console.log(`Models with 'tools' capability: ${modelsWithTools.length}`);

    const modelsWithTemperature = await aiManager.filterModels({
      capabilities: ['temperature']
    });
    console.log(`Models with 'temperature' capability: ${modelsWithTemperature.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await aiManager.destroy();
  }
}

testToolSupport().catch(console.error); 