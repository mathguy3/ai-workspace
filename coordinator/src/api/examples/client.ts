import WebSocket from 'ws';

interface Conversation {
  conversationId: string;
  model: string;
  tools: any[];
  systemPrompt?: string;
}

interface Message {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tools?: any[];
}

class AIManagerClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws') + '/ws';
  }

  // REST API Methods
  async createConversation(model?: string, systemPrompt?: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, systemPrompt })
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    return await response.json() as Conversation;
  }

  async sendMessage(conversationId: string, content: string, tools?: any[]): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tools })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return await response.json() as Message;
  }

  async getConversation(conversationId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/conversations/${conversationId}`);

    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }

    return await response.json();
  }

  async listConversations(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/conversations`);

    if (!response.ok) {
      throw new Error(`Failed to list conversations: ${response.statusText}`);
    }

    return await response.json();
  }

  async getModels(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/models`);

    if (!response.ok) {
      throw new Error(`Failed to get models: ${response.statusText}`);
    }

    return await response.json();
  }

  async getStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/status`);

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return await response.json();
  }

  // WebSocket Methods
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
      });
    });
  }

  subscribeToConversation(conversationId: string): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      conversationId
    }));
  }

  unsubscribeFromConversation(conversationId: string): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      conversationId
    }));
  }

  onMessage(callback: (data: any) => void): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        callback(parsed);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Example usage
async function main() {
  const client = new AIManagerClient();

  try {
    // Check server status
    console.log('Checking server status...');
    const status = await client.getStatus();
    console.log('Server status:', status);

    // Get available models
    console.log('\nGetting available models...');
    const models = await client.getModels();
    console.log(`Found ${models.models.length} models`);

    // Create a conversation
    console.log('\nCreating conversation...');
    const conversation = await client.createConversation(
      'anthropic/claude-3-haiku',
      'You are a helpful coding assistant.'
    );
    console.log('Created conversation:', conversation.conversationId);

    // Connect to WebSocket for real-time updates
    console.log('\nConnecting to WebSocket...');
    await client.connectWebSocket();
    client.subscribeToConversation(conversation.conversationId);

    // Listen for real-time events
    client.onMessage((data) => {
      console.log('WebSocket event:', data.type, data.data);
    });

    // Send a message
    console.log('\nSending message...');
    const message = await client.sendMessage(
      conversation.conversationId,
      'Hello! Can you help me write a simple JavaScript function?'
    );
    console.log('Message sent:', message.content);

    // Wait a bit for the response
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the conversation to see the full history
    console.log('\nGetting conversation history...');
    const fullConversation = await client.getConversation(conversation.conversationId);
    console.log(`Conversation has ${fullConversation.messages.length} messages`);

    // List all conversations
    console.log('\nListing all conversations...');
    const conversations = await client.listConversations();
    console.log(`Found ${conversations.conversations.length} conversations`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    client.disconnect();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { AIManagerClient }; 