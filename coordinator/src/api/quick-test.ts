import { APIServer } from './server';

class QuickTestRunner {
  private server: APIServer;
  private baseUrl: string;

  constructor(port: number = 3002) {
    this.baseUrl = `http://localhost:${port}`;
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

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      await testFn();
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async runQuickTests(): Promise<void> {
    console.log('🚀 Running Quick API Tests...\n');
    
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
      
      // Test basic endpoints
      await this.runTest('Health Check', async () => {
        const response = await this.makeRequest('/health');
        if (response.status !== 'ok') throw new Error('Health check failed');
      });

      await this.runTest('API Status', async () => {
        const response = await this.makeRequest('/api/v1/status');
        if (!response.status) throw new Error('Status endpoint failed');
      });

      await this.runTest('Get Settings', async () => {
        const response = await this.makeRequest('/api/v1/settings');
        if (!response.defaultModel) throw new Error('Settings endpoint failed');
      });

      await this.runTest('Get Models', async () => {
        const response = await this.makeRequest('/api/v1/models');
        if (!response.models || response.models.length === 0) {
          throw new Error('Models endpoint failed');
        }
      });

      await this.runTest('Create Conversation', async () => {
        const response = await this.makeRequest('/api/v1/conversations', {
          method: 'POST',
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct',
            systemPrompt: 'You are a helpful assistant.'
          })
        });
        
        if (!response.conversationId) {
          throw new Error('Create conversation failed');
        }
        
        // Test getting the conversation
        const conversation = await this.makeRequest(`/api/v1/conversations/${response.conversationId}`);
        if (!conversation.conversationId) {
          throw new Error('Get conversation failed');
        }
        
        // Test sending a message
        const messageResponse = await this.makeRequest(`/api/v1/conversations/${response.conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: 'Hello, this is a test!',
            model: 'mistralai/mistral-7b-instruct'
          })
        });
        
        if (!messageResponse.messageId) {
          throw new Error('Send message failed');
        }
        
        // Test listing conversations
        const listResponse = await this.makeRequest('/api/v1/conversations');
        if (!listResponse.conversations || listResponse.conversations.length === 0) {
          throw new Error('List conversations failed');
        }
        
        // Clean up - delete the conversation
        await this.makeRequest(`/api/v1/conversations/${response.conversationId}`, {
          method: 'DELETE'
        });
      });

      console.log('\n🎉 All quick tests passed!');
      
    } catch (error) {
      console.error('\n❌ Quick tests failed:', error);
      process.exit(1);
    } finally {
      this.server.stop();
    }
  }
}

// Run quick tests if this file is executed directly
if (require.main === module) {
  const testRunner = new QuickTestRunner(3002);
  testRunner.runQuickTests().catch(error => {
    console.error('❌ Quick test suite failed to run:', error);
    process.exit(1);
  });
}

export { QuickTestRunner }; 