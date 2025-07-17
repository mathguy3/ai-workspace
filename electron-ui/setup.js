#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🤖 AI Interface Setup');
console.log('=====================\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  if (fs.existsSync(envExamplePath)) {
    // Copy env.example to .env
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envExample);
    console.log('✅ Created .env file from env.example');
    console.log('📝 Please edit .env and add your OpenRouter API key');
  } else {
    console.log('❌ env.example not found');
    process.exit(1);
  }
}

console.log('\n📋 Next steps:');
console.log('1. Edit .env and add your OpenRouter API key');
console.log('2. Start the API server: bun run api:dev');
console.log('3. Start the app: npm run dev');
console.log('\n�� Happy coding!'); 