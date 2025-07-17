# AI Manager API Client

This directory contains the API client that implements the `AIManager` interface by connecting to the AI Manager API server.

## Overview

The API client replaces the local AI manager library with a client that communicates with a REST API and WebSocket server. This provides:

- **Separation of concerns**: AI processing happens on a separate server
- **Scalability**: Multiple clients can connect to the same AI server
- **Real-time updates**: WebSocket connection for live message updates
- **Conversation management**: Full conversation lifecycle support

## Files

- `api-client.ts` - Main API client implementation
- `README.md` - This documentation

## Usage

### Basic Setup

```typescript
import { createAPIClient } from '../shared/utils/api-client';

// Create client instance
const apiClient = createAPIClient('http://localhost:3000');

// Initialize with settings
await apiClient.initialize({
  apiKey: 'your-openrouter-api-key',
  defaultModel: 'anthropic/claude-3-haiku'
});
```

### Configuration

The client can be configured via the `config.ts` file:

```typescript
// src/shared/config.ts
export const config = {
  useAPIClient: true, // Set to false to use mock
  apiServer: {
    baseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    timeout: 30000,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
  },
  development: {
    enableLogging: true,
    mockMode: false, // Force mock mode
  }
};
```

### Conversation Management

The API client supports full conversation management:

```typescript
// Create a new conversation
const conversationId = await apiClient.createConversation({
  model: 'anthropic/claude-3-haiku',
  systemPrompt: 'You are a helpful assistant.'
});

// Send a message
const result = await apiClient.sendMessage('Hello, how are you?');

// Get conversation details
const conversation = await apiClient.getConversation(conversationId);

// Update conversation settings
await apiClient.updateConversation(conversationId, {
  model: 'anthropic/claude-3-sonnet'
});

// Delete conversation
await apiClient.deleteConversation(conversationId);
```

### Event Handling

The client supports real-time events via WebSocket:

```typescript
// Listen for new messages
apiClient.on('onMessageReceived', (message) => {
  console.log('New message:', message);
});

// Listen for errors
apiClient.on('onError', (error) => {
  console.error('AI Error:', error);
});

// Listen for connection status changes
apiClient.on('onConnectionStatusChanged', (connected) => {
  console.log('Connection status:', connected);
});
```

## API Server Requirements

The client expects the AI Manager API server to be running with the following endpoints:

### REST API Endpoints

- `GET /health` - Health check
- `GET /api/v1/status` - Server status
- `GET /api/v1/settings` - Get settings
- `PUT /api/v1/settings` - Update settings
- `POST /api/v1/test-connection` - Test connection
- `GET /api/v1/usage` - Get usage stats
- `GET /api/v1/models` - Get available models
- `POST /api/v1/models/filter` - Filter models
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/{id}` - Get conversation
- `PUT /api/v1/conversations/{id}` - Update conversation
- `DELETE /api/v1/conversations/{id}` - Delete conversation
- `POST /api/v1/conversations/{id}/messages` - Send message
- `GET /api/v1/conversations/{id}/messages` - Get messages

### WebSocket Events

- `connected` - Connection established
- `subscribed` - Subscribed to conversation
- `message` - New message received
- `error` - Error occurred
- `status_update` - Status update
- `tool_call` - Tool call event

## Error Handling

The client includes comprehensive error handling:

```typescript
try {
  await apiClient.sendMessage('Hello');
} catch (error) {
  if (error instanceof AIManagerError) {
    switch (error.code) {
      case 'AUTH_ERROR':
        console.error('Authentication failed');
        break;
      case 'RATE_LIMIT':
        console.error('Rate limit exceeded');
        break;
      case 'NO_CONVERSATION':
        console.error('No active conversation');
        break;
      default:
        console.error('API Error:', error.message);
    }
  }
}
```

## Development vs Production

### Development Mode

For development, you can:

1. **Use the mock**: Set `config.useAPIClient = false`
2. **Force mock mode**: Set `config.development.mockMode = true`
3. **Use API client**: Set `config.useAPIClient = true` and start the API server

### Production Mode

For production:

1. Set `config.useAPIClient = true`
2. Ensure the API server is running and accessible
3. Configure proper API keys and settings

## Troubleshooting

### Common Issues

1. **Connection failed**: Check if the API server is running on the correct port
2. **WebSocket errors**: Verify the WebSocket URL is correct
3. **Authentication errors**: Ensure the API key is valid
4. **Rate limiting**: Check if you've exceeded API limits

### Debug Mode

Enable debug logging by setting `config.development.enableLogging = true`:

```typescript
// The client will log detailed information about:
// - HTTP requests and responses
// - WebSocket connection events
// - Error details
// - Reconnection attempts
```

## Migration from Library

To migrate from the local AI manager library:

1. **Update imports**: Replace library imports with API client
2. **Initialize client**: Call `initialize()` with your settings
3. **Handle async operations**: All operations are now async
4. **Update event handling**: Use the same event system
5. **Test thoroughly**: Verify all functionality works as expected

The API client maintains the same interface as the original library, so existing code should work with minimal changes. 