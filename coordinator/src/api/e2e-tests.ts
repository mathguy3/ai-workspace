import { APIServer } from './server';
import WebSocket from 'ws';
import { 
  CreateConversationRequest, 
  SendMessageRequest, 
  UpdateConversationRequest,
  WebSocketMessage,
  SubscribeMessage,
  UnsubscribeMessage
} from './types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class E2ETestRunner {
  private server: APIServer;
  private baseUrl: string;
  private wsUrl: string;
  private results: TestResult[] = [];
  private conversationId: string = '';
  private wsClient: WebSocket | null = null;
  private wsMessages: any[] = [];

  constructor(port: number = 3001) {
    this.baseUrl = `http://localhost:${port}`;
    this.wsUrl = `ws://localhost:${port}/ws`;
    this.server = new APIServer(port);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsClient = new WebSocket(this.wsUrl);
      
      this.wsClient.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });

      this.wsClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        this.wsMessages.push(message);
        console.log('📨 WebSocket message received:', message.type);
      });

      this.wsClient.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });

      this.wsClient.on('close', () => {
        console.log('🔌 WebSocket disconnected');
      });
    });
  }

  private async sendWebSocketMessage(message: WebSocketMessage): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.wsClient.send(JSON.stringify(message));
  }

  private async waitForWebSocketMessage(type: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkMessages = () => {
        const message = this.wsMessages.find(m => m.type === type);
        if (message) {
          resolve(message);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for WebSocket message type: ${type}`));
          return;
        }
        
        setTimeout(checkMessages, 100);
      };
      
      checkMessages();
    });
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 Running test: ${name}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✅ Test passed: ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMessage, duration });
      console.log(`❌ Test failed: ${name} (${duration}ms): ${errorMessage}`);
    }
  }

  // Test 1: Health Check
  private async testHealthCheck(): Promise<void> {
    const response = await this.makeRequest('/health');
    
    if (!response.status || response.status !== 'ok') {
      throw new Error('Health check failed');
    }
    
    if (!response.timestamp) {
      throw new Error('Health check missing timestamp');
    }
  }

  // Test 2: Get API Status
  private async testApiStatus(): Promise<void> {
    const response = await this.makeRequest('/api/v1/status');
    
    if (!response.status) {
      throw new Error('Status endpoint missing status');
    }
    
    if (!response.wsStats) {
      throw new Error('Status endpoint missing WebSocket stats');
    }
  }

  // Test 3: Get Settings
  private async testGetSettings(): Promise<void> {
    const response = await this.makeRequest('/api/v1/settings');
    
    if (!response.defaultModel) {
      throw new Error('Settings missing default model');
    }
    
    if (typeof response.maxTokens !== 'number') {
      throw new Error('Settings missing max tokens');
    }
  }

  // Test 4: Update Settings
  private async testUpdateSettings(): Promise<void> {
    const newSettings = {
      temperature: 0.8,
      maxTokens: 2048
    };
    
    const response = await this.makeRequest('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(newSettings)
    });
    
    if (!response.message || !response.message.includes('updated')) {
      throw new Error('Settings update failed');
    }
    
    // Verify settings were updated
    const updatedSettings = await this.makeRequest('/api/v1/settings');
    if (updatedSettings.temperature !== 0.8) {
      throw new Error('Settings were not properly updated');
    }
  }

  // Test 5: Test Connection
  private async testConnection(): Promise<void> {
    const response = await this.makeRequest('/api/v1/test-connection', {
      method: 'POST'
    });
    
    if (typeof response.connected !== 'boolean') {
      throw new Error('Test connection response missing connected status');
    }
  }

  // Test 6: Get Usage Stats
  private async testUsageStats(): Promise<void> {
    const response = await this.makeRequest('/api/v1/usage');
    
    if (!response || typeof response !== 'object') {
      throw new Error('Usage stats response invalid');
    }
  }

  // Test 7: Get Models
  private async testGetModels(): Promise<void> {
    const response = await this.makeRequest('/api/v1/models');
    
    if (!response.models || !Array.isArray(response.models)) {
      throw new Error('Models response missing models array');
    }
    
    if (response.models.length === 0) {
      throw new Error('No models returned');
    }
    
    // Check if models have required fields
    const firstModel = response.models[0];
    if (!firstModel.id || !firstModel.name) {
      throw new Error('Model missing required fields');
    }
  }

  // Test 8: Filter Models
  private async testFilterModels(): Promise<void> {
    const filterCriteria = {
      provider: 'openai',
      maxContextLength: 4096
    };
    
    const response = await this.makeRequest('/api/v1/models/filter', {
      method: 'POST',
      body: JSON.stringify(filterCriteria)
    });
    
    if (!response.models || !Array.isArray(response.models)) {
      throw new Error('Filter models response missing models array');
    }
  }

  // Test 9: Get Model by ID
  private async testGetModelById(): Promise<void> {
    // First get all models to get a valid model ID
    const modelsResponse = await this.makeRequest('/api/v1/models');
    const modelId = modelsResponse.models[0].id;
    
    // URL encode the model ID to handle slashes
    const encodedModelId = encodeURIComponent(modelId);
    const response = await this.makeRequest(`/api/v1/models/${encodedModelId}`);
    
    if (!response.model) {
      throw new Error('Get model by ID response missing model');
    }
    
    if (response.model.id !== modelId) {
      throw new Error('Returned model ID does not match requested ID');
    }
  }

  // Test 10: Create Conversation
  private async testCreateConversation(): Promise<void> {
    const conversationData: CreateConversationRequest = {
      model: 'mistralai/mistral-7b-instruct',
      systemPrompt: 'You are a helpful assistant for testing.'
    };
    
    const response = await this.makeRequest('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData)
    });
    
    if (!response.conversationId) {
      throw new Error('Create conversation response missing conversation ID');
    }
    
    if (!response.model) {
      throw new Error('Create conversation response missing model');
    }
    
    this.conversationId = response.conversationId;
    console.log(`📝 Created conversation: ${this.conversationId}`);
  }

  // Test 11: List Conversations
  private async testListConversations(): Promise<void> {
    const response = await this.makeRequest('/api/v1/conversations');
    
    if (!response.conversations || !Array.isArray(response.conversations)) {
      throw new Error('List conversations response missing conversations array');
    }
    
    // Should have at least one conversation (the one we just created)
    if (response.conversations.length === 0) {
      throw new Error('No conversations found after creating one');
    }
    
    const ourConversation = response.conversations.find((c: any) => c.conversationId === this.conversationId);
    if (!ourConversation) {
      throw new Error('Created conversation not found in list');
    }
  }

  // Test 12: Get Conversation
  private async testGetConversation(): Promise<void> {
    const response = await this.makeRequest(`/api/v1/conversations/${this.conversationId}`);
    
    if (!response.conversationId) {
      throw new Error('Get conversation response missing conversation ID');
    }
    
    if (!response.messages || !Array.isArray(response.messages)) {
      throw new Error('Get conversation response missing messages array');
    }
    
    if (!response.model) {
      throw new Error('Get conversation response missing model');
    }
    
    if (response.conversationId !== this.conversationId) {
      throw new Error('Returned conversation ID does not match requested ID');
    }
  }

  // Test 13: Update Conversation
  private async testUpdateConversation(): Promise<void> {
    const updateData: UpdateConversationRequest = {
      systemPrompt: 'You are an updated assistant for testing.'
    };
    
    const response = await this.makeRequest(`/api/v1/conversations/${this.conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    if (!response.message || !response.message.includes('updated')) {
      throw new Error('Update conversation failed');
    }
  }

  // Test 14: Send Message
  private async testSendMessage(): Promise<void> {
    const messageData: SendMessageRequest = {
      content: 'Hello, this is a test message!',
      model: 'mistralai/mistral-7b-instruct'
    };
    
    const response = await this.makeRequest(`/api/v1/conversations/${this.conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    
    if (!response.messageId) {
      throw new Error('Send message response missing message ID');
    }
    
    if (!response.content) {
      throw new Error('Send message response missing content');
    }
    
    if (!response.role) {
      throw new Error('Send message response missing role');
    }
    
    if (!response.timestamp) {
      throw new Error('Send message response missing timestamp');
    }
  }

  // Test 15: Get Messages
  private async testGetMessages(): Promise<void> {
    const response = await this.makeRequest(`/api/v1/conversations/${this.conversationId}/messages`);
    
    if (!response.messages || !Array.isArray(response.messages)) {
      throw new Error('Get messages response missing messages array');
    }
    
    // Should have at least one message (the one we just sent)
    if (response.messages.length === 0) {
      throw new Error('No messages found after sending one');
    }
  }

  // Test 16: WebSocket Connection
  private async testWebSocketConnection(): Promise<void> {
    await this.connectWebSocket();
    
    // Wait for connection confirmation
    const connectedMessage = await this.waitForWebSocketMessage('connected');
    
    if (!connectedMessage.data || !connectedMessage.data.clientId) {
      throw new Error('WebSocket connection message missing client ID');
    }
  }

  // Test 17: WebSocket Subscribe
  private async testWebSocketSubscribe(): Promise<void> {
    const subscribeMessage: SubscribeMessage = {
      type: 'subscribe',
      conversationId: this.conversationId
    };
    
    await this.sendWebSocketMessage(subscribeMessage);
    
    // Wait for subscription confirmation
    const subscribedMessage = await this.waitForWebSocketMessage('subscribed');
    
    if (!subscribedMessage.data || subscribedMessage.data.conversationId !== this.conversationId) {
      throw new Error('WebSocket subscription confirmation missing or incorrect conversation ID');
    }
  }

  // Test 18: WebSocket Message Broadcasting
  private async testWebSocketMessageBroadcasting(): Promise<void> {
    // Send another message to trigger WebSocket broadcasting
    const messageData: SendMessageRequest = {
      content: 'This message should trigger WebSocket events!',
      model: 'mistralai/mistral-7b-instruct'
    };
    
    await this.makeRequest(`/api/v1/conversations/${this.conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    
    // Wait for WebSocket message events
    const messageEvent = await this.waitForWebSocketMessage('message', 10000);
    
    if (!messageEvent.data || !messageEvent.data.conversationId) {
      throw new Error('WebSocket message event missing conversation ID');
    }
    
    if (messageEvent.data.conversationId !== this.conversationId) {
      throw new Error('WebSocket message event has incorrect conversation ID');
    }
  }

  // Test 19: WebSocket Unsubscribe
  private async testWebSocketUnsubscribe(): Promise<void> {
    const unsubscribeMessage: UnsubscribeMessage = {
      type: 'unsubscribe',
      conversationId: this.conversationId
    };
    
    await this.sendWebSocketMessage(unsubscribeMessage);
    
    // Wait for unsubscription confirmation
    const unsubscribedMessage = await this.waitForWebSocketMessage('unsubscribed');
    
    if (!unsubscribedMessage.data || unsubscribedMessage.data.conversationId !== this.conversationId) {
      throw new Error('WebSocket unsubscription confirmation missing or incorrect conversation ID');
    }
  }

  // Test 20: Delete Conversation
  private async testDeleteConversation(): Promise<void> {
    const response = await this.makeRequest(`/api/v1/conversations/${this.conversationId}`, {
      method: 'DELETE'
    });
    
    // DELETE endpoint returns 204 (no content), so response will be empty
    // We just need to verify the request succeeded (no error thrown)
    
    // Verify conversation is deleted
    try {
      await this.makeRequest(`/api/v1/conversations/${this.conversationId}`);
      throw new Error('Conversation still exists after deletion');
    } catch (error) {
      // Expected error - conversation should not exist
      if (!(error instanceof Error) || !error.message.includes('404')) {
        throw new Error('Expected 404 error when accessing deleted conversation');
      }
    }
  }

  // Test 21: Error Handling - Invalid Conversation ID
  private async testErrorHandling(): Promise<void> {
    try {
      await this.makeRequest('/api/v1/conversations/invalid-id');
      throw new Error('Should have returned 404 for invalid conversation ID');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('404')) {
        throw new Error('Expected 404 error for invalid conversation ID');
      }
    }
  }

  // Test 22: Validation - Invalid Request Body
  private async testValidation(): Promise<void> {
    try {
      await this.makeRequest('/api/v1/conversations', {
        method: 'POST',
        body: JSON.stringify({ 
          invalidField: 'test',
          model: 'valid-model'
        })
      });
      throw new Error('Should have returned validation error for invalid request body');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('400')) {
        throw new Error('Expected 400 error for invalid request body');
      }
    }
  }

  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting E2E Test Suite...\n');
    
    try {
      // Initialize server with test settings
      const testSettings = {
        apiKey: process.env.OPENROUTER_API_KEY || 'test-key',
        defaultModel: 'mistralai/mistral-7b-instruct',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 30000
      };
      
      await this.server.initialize(testSettings);
      this.server.start();
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run all tests
      await this.runTest('Health Check', () => this.testHealthCheck());
      await this.runTest('API Status', () => this.testApiStatus());
      await this.runTest('Get Settings', () => this.testGetSettings());
      await this.runTest('Update Settings', () => this.testUpdateSettings());
      await this.runTest('Test Connection', () => this.testConnection());
      await this.runTest('Usage Stats', () => this.testUsageStats());
      await this.runTest('Get Models', () => this.testGetModels());
      await this.runTest('Filter Models', () => this.testFilterModels());
      await this.runTest('Get Model by ID', () => this.testGetModelById());
      await this.runTest('Create Conversation', () => this.testCreateConversation());
      await this.runTest('List Conversations', () => this.testListConversations());
      await this.runTest('Get Conversation', () => this.testGetConversation());
      await this.runTest('Update Conversation', () => this.testUpdateConversation());
      await this.runTest('Send Message', () => this.testSendMessage());
      await this.runTest('Get Messages', () => this.testGetMessages());
      await this.runTest('WebSocket Connection', () => this.testWebSocketConnection());
      await this.runTest('WebSocket Subscribe', () => this.testWebSocketSubscribe());
      await this.runTest('WebSocket Message Broadcasting', () => this.testWebSocketMessageBroadcasting());
      await this.runTest('WebSocket Unsubscribe', () => this.testWebSocketUnsubscribe());
      await this.runTest('Delete Conversation', () => this.testDeleteConversation());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Validation', () => this.testValidation());
      
    } finally {
      // Cleanup
      if (this.wsClient) {
        this.wsClient.close();
      }
      this.server.stop();
    }
    
    this.printResults();
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${(totalDuration / total).toFixed(1)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\n✅ Passed Tests:');
    this.results
      .filter(r => r.passed)
      .forEach(r => {
        console.log(`  - ${r.name} (${r.duration}ms)`);
      });
    
    console.log('\n' + '='.repeat(50));
    
    if (failed > 0) {
      console.log('❌ Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testRunner = new E2ETestRunner(3001);
  testRunner.runAllTests().catch(error => {
    console.error('❌ Test suite failed to run:', error);
    process.exit(1);
  });
}

export { E2ETestRunner }; 