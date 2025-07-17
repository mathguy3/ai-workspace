# API Testing Guide

This document explains how to run the comprehensive test suite for the AI Manager API.

## Test Types

### 1. Quick Tests (`api:quick`)
Fast tests for development that cover the most critical endpoints without WebSocket testing.

**Run with:**
```bash
bun run api:quick
```

**What it tests:**
- Health check endpoint
- API status endpoint
- Settings management
- Models listing
- Basic conversation CRUD operations
- Message sending

### 2. Full E2E Tests (`api:e2e`)
Comprehensive end-to-end tests that cover all API endpoints and WebSocket functionality.

**Run with:**
```bash
bun run api:e2e
```

**What it tests:**
- All quick test functionality
- WebSocket connection and messaging
- Real-time event broadcasting
- Error handling and validation
- Model filtering and retrieval
- Usage statistics
- Connection testing

### 3. Watch Mode (`api:e2e:watch`)
Run E2E tests in watch mode for development.

**Run with:**
```bash
bun run api:e2e:watch
```

## Test Coverage

### API Endpoints Tested

#### Health & Status
- `GET /health` - Server health check
- `GET /api/v1/status` - API status and WebSocket stats

#### Settings Management
- `GET /api/v1/settings` - Get current settings
- `PUT /api/v1/settings` - Update settings

#### Connection & Usage
- `POST /api/v1/test-connection` - Test AI provider connection
- `GET /api/v1/usage` - Get usage statistics

#### Models
- `GET /api/v1/models` - List all available models
- `POST /api/v1/models/filter` - Filter models by criteria
- `GET /api/v1/models/:modelId` - Get specific model details

#### Conversations
- `POST /api/v1/conversations` - Create new conversation
- `GET /api/v1/conversations` - List all conversations
- `GET /api/v1/conversations/:conversationId` - Get specific conversation
- `PUT /api/v1/conversations/:conversationId` - Update conversation settings
- `DELETE /api/v1/conversations/:conversationId` - Delete conversation

#### Messages
- `POST /api/v1/conversations/:conversationId/messages` - Send message
- `GET /api/v1/conversations/:conversationId/messages` - Get conversation messages

### WebSocket Events Tested

#### Connection Events
- `connected` - Client connection confirmation
- `subscribed` - Conversation subscription confirmation
- `unsubscribed` - Conversation unsubscription confirmation

#### Real-time Events
- `status_update` - AI manager status changes
- `message` - New message received
- `tool_call` - Tool execution events
- `error` - Error events
- `conversation_created` - New conversation created
- `conversation_updated` - Conversation updated
- `conversation_deleted` - Conversation deleted

### Error Handling & Validation
- Invalid conversation IDs (404 errors)
- Invalid request bodies (400 validation errors)
- Missing required fields
- Rate limiting
- Request size limits

## Test Environment Setup

### Required Environment Variables
```bash
# Required for AI provider connection
export OPENROUTER_API_KEY="your-api-key-here"

# Optional - defaults will be used if not set
export DEFAULT_MODEL="mistralai/mistral-7b-instruct"
export MAX_TOKENS="4096"
export TEMPERATURE="0.7"
export TIMEOUT="30000"
```

### Test Ports
- **Quick Tests**: Port 3002
- **E2E Tests**: Port 3001
- **Development Server**: Port 3000

## Running Tests

### Prerequisites
1. Install dependencies: `bun install`
2. Set up environment variables (see above)
3. Ensure no other services are running on test ports

### Basic Test Execution
```bash
# Quick tests (recommended for development)
bun run api:quick

# Full E2E tests (recommended for CI/CD)
bun run api:e2e

# Watch mode for development
bun run api:e2e:watch
```

### Test Output

#### Successful Test Run
```
🚀 Starting E2E Test Suite...

🧪 Running test: Health Check
✅ Test passed: Health Check (45ms)

🧪 Running test: API Status
✅ Test passed: API Status (32ms)

...

📊 Test Results Summary:
==================================================
Total Tests: 22
Passed: 22
Failed: 0
Success Rate: 100.0%
Total Duration: 15420ms
Average Duration: 700.9ms

🎉 All tests passed!
```

#### Failed Test Run
```
❌ Test failed: Send Message (5000ms): HTTP 500: Internal Server Error

📊 Test Results Summary:
==================================================
Total Tests: 22
Passed: 21
Failed: 1
Success Rate: 95.5%

❌ Failed Tests:
  - Send Message: HTTP 500: Internal Server Error

❌ Some tests failed. Please check the errors above.
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution**: Stop other services or change test ports in the test files.

#### 2. WebSocket Connection Failed
```
❌ WebSocket error: connect ECONNREFUSED
```
**Solution**: Ensure the server is properly initialized and started before WebSocket tests.

#### 3. API Key Issues
```
❌ Test failed: Test Connection: HTTP 500: Invalid API key
```
**Solution**: Set the `OPENROUTER_API_KEY` environment variable with a valid key.

#### 4. Timeout Errors
```
❌ Test failed: WebSocket Message Broadcasting: Timeout waiting for WebSocket message type: message
```
**Solution**: Increase timeout values or check if the AI provider is responding slowly.

### Debug Mode

To run tests with more verbose output, you can modify the test files to include additional logging:

```typescript
// In e2e-tests.ts or quick-test.ts
console.log('Request URL:', url);
console.log('Request body:', options.body);
console.log('Response:', response);
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run api:e2e
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

### Local CI Setup
```bash
# Run all tests before committing
bun run api:quick && bun run api:e2e

# Or use a pre-commit hook
echo 'bun run api:quick' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Performance Testing

The test suite includes performance metrics:
- Individual test duration
- Total test suite duration
- Average test duration

For performance regression testing, you can compare these metrics across different runs.

## Extending Tests

### Adding New Tests

1. Add a new test method to the `E2ETestRunner` class:
```typescript
private async testNewFeature(): Promise<void> {
  const response = await this.makeRequest('/api/v1/new-endpoint');
  
  if (!response.expectedField) {
    throw new Error('New feature test failed');
  }
}
```

2. Add the test to the `runAllTests` method:
```typescript
await this.runTest('New Feature', () => this.testNewFeature());
```

### Custom Test Scenarios

You can create custom test scenarios by extending the test classes:

```typescript
class CustomTestRunner extends E2ETestRunner {
  private async testCustomScenario(): Promise<void> {
    // Custom test logic
  }
  
  public async runCustomTests(): Promise<void> {
    await this.runTest('Custom Scenario', () => this.testCustomScenario());
  }
}
```

## Best Practices

1. **Always clean up**: Tests should clean up after themselves (delete conversations, close connections)
2. **Use descriptive test names**: Make test failures easy to understand
3. **Test error conditions**: Include tests for invalid inputs and error handling
4. **Keep tests independent**: Each test should be able to run in isolation
5. **Use appropriate timeouts**: Set realistic timeouts for async operations
6. **Validate responses**: Check both success and error response structures 