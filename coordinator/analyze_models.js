const fs = require('fs');

// Read the models data
const modelsData = JSON.parse(fs.readFileSync('models.json', 'utf8'));

// Filter for free models that support tools
const freeModelsWithTools = modelsData.data.filter(model => {
  // Check if it's free (prompt and completion are 0)
  const isFree = model.pricing.prompt === "0" && model.pricing.completion === "0";
  
  // Check if it supports tools
  const supportsTools = model.supported_parameters && 
    model.supported_parameters.includes('tools');
  
  return isFree && supportsTools;
});

// Sort by context length (which correlates with input parameters)
freeModelsWithTools.sort((a, b) => b.context_length - a.context_length);

console.log('🔍 Free Models with Tool Support (sorted by context length):\n');

freeModelsWithTools.slice(0, 10).forEach((model, index) => {
  console.log(`${index + 1}. ${model.name}`);
  console.log(`   ID: ${model.id}`);
  console.log(`   Context Length: ${model.context_length.toLocaleString()} tokens`);
  console.log(`   Description: ${model.description.substring(0, 150)}...`);
  console.log(`   Supported Parameters: ${model.supported_parameters.join(', ')}`);
  console.log('');
});

// Find models with "32B", "72B", etc. in their names
const largeModels = freeModelsWithTools.filter(model => {
  const name = model.name.toLowerCase();
  return name.includes('32b') || name.includes('72b') || name.includes('235b') || 
         name.includes('300b') || name.includes('671b') || name.includes('1000b');
});

if (largeModels.length > 0) {
  console.log('🚀 Large Parameter Models (32B+):\n');
  largeModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Context Length: ${model.context_length.toLocaleString()} tokens`);
    console.log(`   Description: ${model.description.substring(0, 150)}...`);
    console.log('');
  });
}

// Show the best overall choice
if (freeModelsWithTools.length > 0) {
  const bestModel = freeModelsWithTools[0];
  console.log('🏆 RECOMMENDATION:');
  console.log(`Best free model with tool support: ${bestModel.name}`);
  console.log(`Model ID: ${bestModel.id}`);
  console.log(`Context Length: ${bestModel.context_length.toLocaleString()} tokens`);
  console.log(`This model has the largest context window among free models with tool support.`);
} 