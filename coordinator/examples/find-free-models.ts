import { AIManager, AISettings } from '../src/index.js';

async function findFreeModels() {
  const aiManager = new AIManager();

  const settings: AISettings = {
    apiKey: (globalThis as any).process?.env?.OPENROUTER_API_KEY || 'your-api-key-here',
    defaultModel: 'openai/gpt-4',
    maxTokens: 1000,
    temperature: 0.7
  };

  try {
    console.log('🔍 Finding free models on OpenRouter...');
    await aiManager.initialize(settings);

    // Get available models
    const models = await aiManager.getAvailableModels();
    
    // Find free models (where both prompt and completion pricing are 0)
    const freeModels = models.filter(model => {
      return model.pricing && 
             model.pricing.input === 0 && 
             model.pricing.output === 0;
    });

    console.log(`\n💰 Free Models Found: ${freeModels.length}`);
    console.log(`Total models available: ${models.length}`);

    if (freeModels.length > 0) {
      console.log('\n📋 Available Free Models:');
      freeModels.forEach((model, index) => {
        console.log(`\n${index + 1}. ${model.name}`);
        console.log(`   ID: ${model.id}`);
        console.log(`   Provider: ${model.provider}`);
        console.log(`   Context Length: ${model.contextLength?.toLocaleString() || 'Unknown'}`);
        console.log(`   Supports Tools: ${model.supportsTools ? '✅ Yes' : '❌ No'}`);
        console.log(`   Pricing: $${model.pricing?.input}/1K input, $${model.pricing?.output}/1K output`);
        
        if (model.capabilities && model.capabilities.length > 0) {
          console.log(`   Capabilities: ${model.capabilities.slice(0, 5).join(', ')}${model.capabilities.length > 5 ? '...' : ''}`);
        }
      });

      // Show some recommendations
      console.log('\n🎯 Recommendations:');
      
      const toolSupportingFree = freeModels.filter(m => m.supportsTools);
      if (toolSupportingFree.length > 0) {
        console.log(`• For tool usage: ${toolSupportingFree[0].name} (${toolSupportingFree[0].id})`);
      }

      const highContextFree = freeModels
        .filter(m => m.contextLength && m.contextLength > 32000)
        .sort((a, b) => (b.contextLength || 0) - (a.contextLength || 0));
      
      if (highContextFree.length > 0) {
        console.log(`• For long context: ${highContextFree[0].name} (${highContextFree[0].id}) - ${highContextFree[0].contextLength?.toLocaleString()} tokens`);
      }

      const popularProviders = ['openai', 'anthropic', 'google', 'mistralai'];
      for (const provider of popularProviders) {
        const providerModel = freeModels.find(m => m.provider === provider);
        if (providerModel) {
          console.log(`• ${provider} model: ${providerModel.name} (${providerModel.id})`);
        }
      }

    } else {
      console.log('\n❌ No free models found. All models have some cost associated with them.');
      
      // Show the cheapest models instead
      const cheapestModels = models
        .filter(m => m.pricing)
        .sort((a, b) => {
          const aTotal = (a.pricing?.input || 0) + (a.pricing?.output || 0);
          const bTotal = (b.pricing?.input || 0) + (b.pricing?.output || 0);
          return aTotal - bTotal;
        })
        .slice(0, 5);

      console.log('\n💡 Cheapest Models (per 1K tokens):');
      cheapestModels.forEach((model, index) => {
        const totalCost = (model.pricing?.input || 0) + (model.pricing?.output || 0);
        console.log(`${index + 1}. ${model.name} - $${totalCost.toFixed(6)} total`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await aiManager.destroy();
  }
}

findFreeModels().catch(console.error); 