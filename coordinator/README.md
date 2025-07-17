# AI Manager Library

A flexible TypeScript library for managing AI interactions with OpenRouter, featuring tool handling, async message continuation, and comprehensive status tracking.

## Features

- 🤖 **OpenRouter Integration**: Connect to multiple AI models through OpenRouter
- 🛠️ **Tool Support**: Opaque tool handling with dynamic capability detection
- ⚡ **Async Processing**: Non-blocking message handling with status updates

- 📊 **Status Tracking**: Real-time status monitoring (idle, thinking, working, error)
- 🌐 **REST API**: Full HTTP API with WebSocket support for real-time events
- 🔄 **Event System**: Comprehensive event emission for integration
- 📈 **Usage Analytics**: Token and cost tracking
- 🎯 **Model Management**: Dynamic model discovery and filtering

## Installation

```bash
npm install @coordinator/ai-manager
```

## Quick Start

### Library Usage

```typescript
import { AIManager } from '@coordinator/ai-manager';

const aiManager = new AIManager();

await aiManager.initialize({
  apiKey: 'your-openrouter-api-key',
  defaultModel: 'anthropic/claude-3-haiku'
});

const result = await aiManager.sendMessage('Hello, how are you?');
console.log(result.message.content);
```

### API Server

Start the REST API server with WebSocket support:

```bash
# Set your API key
export OPENROUTER_API_KEY="your-api-key-here"

# Start the server
bun run api:dev
```

The API will be available at:
- **HTTP API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **Documentation**: See [api/README.md](api/README.md)

## API Reference

### AIManager

The main class for managing AI interactions.

#### Methods

##### `initialize(settings: AISettings): Promise<void>`
Initialize the AI Manager with your settings.

##### `sendMessage(content: string, options?: SendMessageOptions): Promise<SendMessageResult>`
Send a message to the AI and get a response.

##### `getStatus(): AIManagerStatus`
Get the current status of the AI Manager.

##### `getAvailableModels(): Promise<AIModel[]>`
Get all available models from OpenRouter.

##### `on(event, callback)`
Register an event listener.

##### `off(event, callback)`
Remove an event listener.

### Events

- `onMessageReceived`: Fired when a message is received from the AI
- `onError`: Fired when an error occurs
- `onConnectionStatusChanged`: Fired when connection status changes
- `onModelsUpdated`: Fired when available models are updated
- `onStatusChanged`: Fired when the AI Manager status changes


### Status Types

- `idle`: Ready to process messages
- `thinking`: Processing a user message
- `working`: Executing tools or performing background tasks
- `error`: An error has occurred
- `connecting`: Establishing connection

## Configuration

### AISettings

```typescript
interface AISettings {
  apiKey: string;           // Your OpenRouter API key
  defaultModel: string;     // Default model to use
  maxTokens?: number;       // Maximum tokens per response
  temperature?: number;     // Response randomness (0-1)
  topP?: number;           // Nucleus sampling parameter
  baseUrl?: string;        // OpenRouter API base URL
  timeout?: number;        // Request timeout in ms
  retryAttempts?: number;  // Number of retry attempts
}
```

### SendMessageOptions

```typescript
interface SendMessageOptions {
  model?: string;           // Override default model
  systemPrompt?: string;    // System prompt for this message
  maxTokens?: number;       // Override max tokens
  temperature?: number;     // Override temperature
  topP?: number;           // Override top_p
  stream?: boolean;        // Enable streaming
  conversationId?: string; // Continue existing conversation
}
```

## Conversation Management

The AI Manager automatically handles conversation state:

```typescript
// Start a new conversation
const result1 = await aiManager.sendMessage('Hello');

// Continue the same conversation
const result2 = await aiManager.sendMessage('How are you?', {
  conversationId: result1.conversationId
});

// List all conversations
const conversations = await aiManager.listConversations();

// Get a specific conversation
const conversation = await aiManager.getConversation(result1.conversationId);

// Delete a conversation
await aiManager.deleteConversation(result1.conversationId);
```

## Error Handling

The library provides custom error types:

```typescript
import { 
  AuthenticationError, 
  RateLimitError, 
  ConnectionError,
  ModelNotFoundError 
} from '@coordinator/ai-manager';

try {
  await aiManager.sendMessage('Hello');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded');
  } else if (error instanceof ConnectionError) {
    console.log('Connection failed');
  }
}
```

## Agent Coordination

The AI Manager includes built-in agent coordination for specialized task handling:

```typescript
// Initialize AI Manager (agents are automatically registered)
const aiManager = new AIManager();
await aiManager.initialize(aiSettings);

// Built-in agents are automatically available
console.log('Available agents:', aiManager.getAgentMetadata().map(a => a.name));
// Output: ['Code Analysis Agent']

// Send a message that will trigger agent delegation
const result = await aiManager.sendMessage(`
  Can you analyze this code for security vulnerabilities?
  
  \`\`\`javascript
  function processUserInput(input) {
    const query = 'SELECT * FROM users WHERE id = ' + input;
    return database.execute(query);
  }
  \`\`\`
`);

// The system will automatically delegate to the Code Analysis Agent
// and provide a comprehensive analysis
```

### Available Agents

- **Code Analysis Agent**: Analyzes code for quality, security vulnerabilities, performance issues, and best practices
- More agents will be added in future releases

### Agent Management

```typescript
// List all registered agents
const agents = aiManager.getAllAgents();

// Get agent metadata
const metadata = aiManager.getAgentMetadata();

// Register custom agents
const customAgent = new CustomAgent();
await customAgent.initialize({ aiSettings });
aiManager.registerAgent(customAgent);

// Unregister agents
aiManager.unregisterAgent('agent-id');
```

## Usage Statistics

Track your API usage:

```typescript
const stats = await aiManager.getUsageStats();
console.log('Total tokens:', stats.totalTokens);
console.log('Total cost:', stats.totalCost);
console.log('Total requests:', stats.requests);
```

## Development

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm

### Setup

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Run tests
bun test

# Development mode
bun run dev
```

### Project Structure

```
src/
├── core/              # Core implementation
│   ├── AIManager.ts   # Main AI Manager class
│   ├── StatusManager.ts
│   └── ConversationManager.ts
├── providers/         # API providers
│   └── OpenRouterProvider.ts
├── tools/            # Tool system (Phase 2)
├── types/            # Type definitions
│   └── index.ts
├── utils/            # Utilities
│   └── EventEmitter.ts
└── index.ts          # Main entry point
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Roadmap

- [x] Phase 1: Core infrastructure and OpenRouter integration
- [ ] Phase 2: Agent system and execution pipeline
- [ ] Phase 3: Async message handling and advanced features
- [ ] Phase 4: Spontaneous messages and complex workflows 