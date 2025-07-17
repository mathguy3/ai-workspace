# AI Manager API

A REST API and WebSocket server that provides an interface to the AI Manager library with enhanced conversation management, real-time updates, and robust error handling.

## Quick Start

1. Set your OpenRouter API key:
```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

2. Start the server:
```bash
# Development mode
bun run api:dev

# Production mode
bun run api:build
bun run api:start
```

3. The server will be available at:
- **HTTP API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **Health Check**: http://localhost:3000/health

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | - | **Required** Your OpenRouter API key |
| `PORT` | 3000 | Server port |
| `DEFAULT_MODEL` | mistralai/mistral-7b-instruct | Default AI model |
| `MAX_TOKENS` | 4096 | Maximum tokens per response |
| `TEMPERATURE` | 0.7 | AI response temperature |
| `TIMEOUT` | 30000 | Request timeout in ms |
| `CORS_ORIGIN` | * | CORS origin (use * for development) |
| `NODE_ENV` | development | Environment mode |

## Features

### ✅ Phase 1 Improvements
- **Conversation Context Tracking**: Events are properly scoped to specific conversations
- **Conversation-Specific Settings**: Each conversation can have its own model and system prompt
- **Enhanced Error Handling**: Structured error responses with proper HTTP status codes
- **Request Validation**: Comprehensive input validation and rate limiting
- **Real-time Updates**: WebSocket events with conversation context

## REST API Endpoints

### Health Check
```http
GET /health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "aiManagerStatus": "idle"
}
```

### Status
```http
GET /api/v1/status
```
Returns AI Manager status and WebSocket statistics.

**Response:**
```json
{
  "status": "idle",
  "details": "Ready to process requests",
  "connected": true,
  "wsStats": {
    "clients": 2,
    "subscriptions": 1
  }
}
```

### Settings
```http
GET /api/v1/settings
```
Get current AI Manager settings.

```http
PUT /api/v1/settings
```
Update AI Manager settings.

**Request Body:**
```json
{
  "apiKey": "new-api-key",
  "defaultModel": "anthropic/claude-3-haiku",
  "maxTokens": 8192,
  "temperature": 0.5
}
```

### Test Connection
```http
POST /api/v1/test-connection
```
Test the connection to OpenRouter.

**Response:**
```json
{
  "connected": true
}
```

### Usage Statistics
```http
GET /api/v1/usage
```
Get usage statistics.

**Response:**
```json
{
  "totalTokens": 15000,
  "totalCost": 0.045,
  "requests": 25
}
```

## Conversations API

### Create Conversation
```http
POST /api/v1/conversations
```

**Request Body:**
```json
{
  "model": "anthropic/claude-3-haiku",
  "systemPrompt": "You are a helpful assistant."
}
```

**Response:**
```json
{
  "conversationId": "conv_1704067200000_abc123",
  "model": "anthropic/claude-3-haiku",
  "systemPrompt": "You are a helpful assistant."
}
```

**Note**: Conversations are now created with their settings stored immediately, without requiring an initial message.

### List Conversations
```http
GET /api/v1/conversations
```

**Response:**
```json
{
  "conversations": [
    {
      "conversationId": "conv_1704067200000_abc123",
      "lastMessage": "Hello, how can I help you?",
      "messageCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

### Get Conversation
```http
GET /api/v1/conversations/{conversationId}
```

**Response:**
```json
{
  "conversationId": "conv_1704067200000_abc123",
  "messages": [
    {
      "id": "msg_1704067200000_xyz789",
      "content": "Hello",
      "role": "user",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "msg_1704067205000_def456",
      "content": "Hello! How can I help you today?",
      "role": "assistant",
      "timestamp": "2024-01-01T00:00:05.000Z"
    }
  ],
  "model": "anthropic/claude-3-haiku",
  "systemPrompt": "You are a helpful assistant.",
  "status": "idle"
}
```

**Note**: The model and systemPrompt now reflect the conversation's specific settings, not global settings.

### Update Conversation
```http
PUT /api/v1/conversations/{conversationId}
```

**Request Body:**
```json
{
  "model": "anthropic/claude-3-sonnet",
  "systemPrompt": "You are a coding assistant."
}
```

**Response:**
```json
{
  "message": "Conversation updated successfully"
}
```

**Note**: Updates now modify conversation-specific settings, not global settings.

### Delete Conversation
```http
DELETE /api/v1/conversations/{conversationId}
```

### Send Message
```http
POST /api/v1/conversations/{conversationId}/messages
```

**Request Body:**
```json
{
  "content": "What's the weather like in New York?",
  "model": "anthropic/claude-3-haiku"
}
```

**Response:**
```json
{
  "messageId": "msg_1704067210000_ghi789",
  "content": "Let me check the weather in New York for you.",
  "role": "assistant",
  "timestamp": "2024-01-01T00:10:00.000Z"
}
```

### Get Messages
```http
GET /api/v1/conversations/{conversationId}/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_1704067200000_xyz789",
      "content": "Hello",
      "role": "user",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Models API

### Get All Models
```http
GET /api/v1/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "anthropic/claude-3-haiku",
      "name": "Claude 3 Haiku",
      "provider": "Anthropic",
      "contextLength": 200000,
      "capabilities": ["chat", "tools"],
      "pricing": {
        "input": 0.25,
        "output": 1.25
      },
      "supportsTools": true
    }
  ]
}
```

### Get Model by ID
```http
GET /api/v1/models/{modelId}
```

### Filter Models
```http
POST /api/v1/models/filter
```

**Request Body:**
```json
{
  "provider": "Anthropic",
  "capabilities": ["tools"],
  "maxContextLength": 100000
}
```

## WebSocket API

Connect to `ws://localhost:3000/ws` for real-time updates with conversation context.

### Connection
When you connect, you'll receive a welcome message:
```json
{
  "type": "connected",
  "data": {
    "clientId": "client_1704067200000_abc123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Subscribe to Conversation
Send this message to subscribe to conversation events:
```json
{
  "type": "subscribe",
  "conversationId": "conv_1704067200000_abc123"
}
```

You'll receive a confirmation:
```json
{
  "type": "subscribed",
  "data": {
    "conversationId": "conv_1704067200000_abc123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Unsubscribe from Conversation
```json
{
  "type": "unsubscribe",
  "conversationId": "conv_1704067200000_abc123"
}
```

### Event Types

#### Status Update
```json
{
  "type": "status_update",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "status": "thinking",
    "message": "Processing your request..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Message Received
```json
{
  "type": "message",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "message": {
      "id": "msg_1704067205000_def456",
      "content": "Hello! How can I help you?",
      "role": "assistant",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Tool Call
```json
{
  "type": "tool_call",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "toolCall": {
      "id": "tool_1704067200000_xyz789",
      "name": "get_weather",
      "arguments": {
        "location": "New York"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "error": "API rate limit exceeded",
    "details": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Conversation Lifecycle Events
```json
{
  "type": "conversation_created",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "settings": {
      "model": "anthropic/claude-3-haiku",
      "systemPrompt": "You are a helpful assistant."
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

```json
{
  "type": "conversation_updated",
  "data": {
    "conversationId": "conv_1704067200000_abc123",
    "settings": {
      "model": "anthropic/claude-3-sonnet"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

```json
{
  "type": "conversation_deleted",
  "data": {
    "conversationId": "conv_1704067200000_abc123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

All endpoints return errors in this structured format:
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "statusCode": 400,
  "details": "Additional error details (development only)"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation Error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `408` - Request Timeout
- `413` - Payload Too Large
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

### Validation Errors
When input validation fails, you'll receive detailed error information:
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "statusCode": 400,
  "details": [
    {
      "field": "content",
      "message": "Content is required",
      "code": "invalid_type"
    }
  ]
}
```

## Request Validation

The API now includes comprehensive request validation:

- **Content-Type**: Must be `application/json` for POST/PUT requests
- **Request Size**: Limited to 1MB by default
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All request bodies and parameters are validated
- **Timeout**: 30-second request timeout

## Example Usage

### JavaScript/TypeScript Client
```typescript
// REST API
const response = await fetch('http://localhost:3000/api/v1/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'anthropic/claude-3-haiku',
    systemPrompt: 'You are a helpful assistant.'
  })
});

const conversation = await response.json();

// WebSocket with conversation context
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    conversationId: conversation.conversationId
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  // Events now include conversation context
  if (data.type === 'message' && data.data.conversationId === conversation.conversationId) {
    console.log('New message in conversation:', data.data.message);
  }
};
```

### cURL Examples
```bash
# Create conversation with settings
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "Content-Type: application/json" \
  -d '{"model": "anthropic/claude-3-haiku", "systemPrompt": "You are a coding assistant."}'

# Send message
curl -X POST http://localhost:3000/api/v1/conversations/conv_1704067200000_abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, how are you?"}'

# Update conversation settings
curl -X PUT http://localhost:3000/api/v1/conversations/conv_1704067200000_abc123 \
  -H "Content-Type: application/json" \
  -d '{"model": "anthropic/claude-3-sonnet"}'

# Get models
curl http://localhost:3000/api/v1/models
```

## Development

### Running in Development Mode
```bash
bun run api:dev
```

### Building for Production
```bash
bun run api:build
bun run api:start
```

### Environment Setup
Create a `.env` file:
```env
OPENROUTER_API_KEY=your-api-key-here
PORT=3000
DEFAULT_MODEL=anthropic/claude-3-haiku
NODE_ENV=development
```

### Middleware Stack
The API now includes a comprehensive middleware stack:
- **Security**: Helmet for security headers
- **CORS**: Configurable cross-origin requests
- **Compression**: Response compression
- **Validation**: Request validation and sanitization
- **Rate Limiting**: Request rate limiting
- **Error Handling**: Structured error responses
- **Logging**: Request logging and error tracking 