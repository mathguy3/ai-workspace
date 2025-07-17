// AI Manager API Client
// Implements the AIManager interface using REST API and WebSocket connections

import { 
  AIManager, 
  AIMessage, 
  AIModel, 
  AISettings, 
  SendMessageOptions, 
  SendMessageResult, 
  AIManagerEvents,
  AIManagerError,
  AuthenticationError,
  ModelNotFoundError,
  RateLimitError,
  APIConversation,
  APIConversationDetails,
  UpdateConversationRequest
} from '../types/ai-manager';

// API Types
interface APIStatus {
  status: string;
  details: string;
  connected: boolean;
  wsStats: {
    clients: number;
    subscriptions: number;
  };
}

interface APIUsage {
  totalTokens: number;
  totalCost: number;
  requests: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface CreateConversationRequest {
  model?: string;
  systemPrompt?: string;
}

interface SendMessageRequest {
  content: string;
  model?: string;
}

interface FilterModelsRequest {
  provider?: string;
  capabilities?: string[];
  maxContextLength?: number;
}

export class APIClient implements AIManager {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private eventCallbacks: Map<keyof AIManagerEvents, Set<any>> = new Map();
  private currentConversationId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 10000;
  private isDestroyed = false;
  private isInitialized = false;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws') + '/ws';
  }

  // Initialization and lifecycle
  async initialize(settings: AISettings): Promise<void> {
    console.log('🔧 API Client: Initializing with settings:', { ...settings, apiKey: settings.apiKey ? '[REDACTED]' : 'undefined' });
    try {
      // Update settings on the server
      await this.updateSettings(settings);
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      this.isInitialized = true;
      console.log('✅ API Client: Initialized successfully');
    } catch (error) {
      console.error('❌ API Client: Failed to initialize:', error);
      throw new AIManagerError(
        `Failed to initialize API client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR',
        error
      );
    }
  }

  async destroy(): Promise<void> {
    console.log('🔄 API Client: Destroying...');
    this.isDestroyed = true;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Clear all event callbacks
    this.eventCallbacks.clear();
    
    console.log('✅ API Client: Destroyed');
  }

  // Message handling
  async sendMessage(content: string, options?: SendMessageOptions): Promise<SendMessageResult> {
    console.log('💬 API Client: Sending message:', { content: content.substring(0, 100) + (content.length > 100 ? '...' : ''), options });
    
    // Check if client is initialized
    if (!this.isInitialized) {
      console.error('❌ API Client: Not initialized');
      throw new AIManagerError(
        'API client not initialized. Please configure your settings first by opening the settings modal and entering your API key.',
        'NOT_INITIALIZED'
      );
    }

    // If no conversation exists, create one automatically
    if (!this.currentConversationId) {
      try {
        console.log('🆕 API Client: No active conversation, creating one...');
        this.currentConversationId = await this.createConversation({
          model: options?.model
        });
        console.log('✅ API Client: Created conversation:', this.currentConversationId);
      } catch (error) {
        console.error('❌ API Client: Failed to create conversation:', error);
        throw new AIManagerError('Failed to create conversation. Please check your settings.', 'CONVERSATION_CREATE_ERROR');
      }
    }

    try {
      const response = await this.makeRequest<AIMessage>(
        `POST /api/v1/conversations/${this.currentConversationId}/messages`,
        {
          content,
          model: options?.model
        }
      );

      console.log('✅ API Client: Message sent successfully:', { messageId: response.id, role: response.role });
      return {
        message: response,
        usage: undefined // Usage info not provided by API in this endpoint
      };
    } catch (error) {
      console.error('❌ API Client: Failed to send message:', error);
      throw this.handleAPIError(error);
    }
  }

  // Settings management
  async updateSettings(settings: Partial<AISettings>): Promise<void> {
    console.log('⚙️ API Client: Updating settings:', { ...settings, apiKey: settings.apiKey ? '[REDACTED]' : 'undefined' });
    try {
      await this.makeRequest('PUT /api/v1/settings', settings);
      console.log('✅ API Client: Settings updated successfully');
    } catch (error) {
      console.error('❌ API Client: Failed to update settings:', error);
      throw this.handleAPIError(error);
    }
  }

  async getSettings(): Promise<AISettings> {
    console.log('📋 API Client: Getting settings...');
    try {
      const settings = await this.makeRequest<AISettings>('GET /api/v1/settings');
      console.log('✅ API Client: Settings retrieved:', { ...settings, apiKey: settings.apiKey ? '[REDACTED]' : 'undefined' });
      return settings;
    } catch (error) {
      console.error('❌ API Client: Failed to get settings:', error);
      throw this.handleAPIError(error);
    }
  }

  // Model management
  async getAvailableModels(): Promise<AIModel[]> {
    console.log('🤖 API Client: Getting available models...');
    try {
      const response = await this.makeRequest<{ models: AIModel[] }>('GET /api/v1/models');
      console.log('✅ API Client: Retrieved models:', response.models.length, 'models');
      return response.models;
    } catch (error) {
      console.error('❌ API Client: Failed to get models:', error);
      throw this.handleAPIError(error);
    }
  }

  async getModelById(id: string): Promise<AIModel | null> {
    try {
      return await this.makeRequest<AIModel>(`GET /api/v1/models/${id}`);
    } catch (error) {
      if (error instanceof ModelNotFoundError) {
        return null;
      }
      throw this.handleAPIError(error);
    }
  }

  async filterModels(criteria: {
    provider?: string;
    capabilities?: string[];
    maxContextLength?: number;
  }): Promise<AIModel[]> {
    try {
      const response = await this.makeRequest<{ models: AIModel[] }>(
        'POST /api/v1/models/filter',
        criteria
      );
      return response.models;
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  // Event handling
  on(event: keyof AIManagerEvents, callback: AIManagerEvents[keyof AIManagerEvents]): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
  }

  off(event: keyof AIManagerEvents, callback: AIManagerEvents[keyof AIManagerEvents]): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isInitialized;
  }

  async testConnection(): Promise<boolean> {
    console.log('🔍 API Client: Testing connection...');
    try {
      const response = await this.makeRequest<{ connected: boolean }>('POST /api/v1/test-connection', {});
      console.log('✅ API Client: Connection test successful:', response);
      return response.connected;
    } catch (error) {
      console.error('❌ API Client: Connection test failed:', error);
      return false;
    }
  }

  // Check WebSocket health
  private async checkWebSocketHealth(): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      // Send a ping message to check if the connection is alive
      this.ws.send(JSON.stringify({ type: 'ping' }));
      return true;
    } catch (error) {
      console.error('❌ API Client: WebSocket health check failed:', error);
      return false;
    }
  }

  // Utility methods
  async validateApiKey(apiKey: string): Promise<boolean> {
    console.log('🔑 API Client: Validating API key...');
    try {
      // Temporarily update settings with the new API key
      const currentSettings = await this.getSettings();
      await this.updateSettings({ ...currentSettings, apiKey });
      
      // Test the connection
      const isConnected = await this.testConnection();
      
      // Restore original settings if validation failed
      if (!isConnected) {
        console.log('⚠️ API Client: API key validation failed, restoring original settings');
        await this.updateSettings(currentSettings);
      } else {
        console.log('✅ API Client: API key validation successful');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ API Client: API key validation error:', error);
      return false;
    }
  }

  async getUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requests: number;
  }> {
    try {
      return await this.makeRequest<APIUsage>('GET /api/v1/usage');
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  // Conversation management methods
  async createConversation(options?: { model?: string; systemPrompt?: string }): Promise<string> {
    console.log('🆕 API Client: Creating conversation:', options);
    try {
      const response = await this.makeRequest<{ conversationId: string }>(
        'POST /api/v1/conversations',
        options
      );
      
      this.currentConversationId = response.conversationId;
      console.log('✅ API Client: Created conversation:', this.currentConversationId);
      
      // Subscribe to conversation events
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('📡 API Client: Subscribing to conversation events');
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          conversationId: this.currentConversationId
        }));
      }
      
      return this.currentConversationId;
    } catch (error) {
      console.error('❌ API Client: Failed to create conversation:', error);
      throw this.handleAPIError(error);
    }
  }

  async getConversations(): Promise<APIConversation[]> {
    try {
      const response = await this.makeRequest<{ conversations: APIConversation[] }>('GET /api/v1/conversations');
      return response.conversations;
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async getConversation(conversationId: string): Promise<APIConversationDetails> {
    try {
      return await this.makeRequest<APIConversationDetails>(`GET /api/v1/conversations/${conversationId}`);
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async updateConversation(conversationId: string, updates: UpdateConversationRequest): Promise<void> {
    try {
      await this.makeRequest(`PUT /api/v1/conversations/${conversationId}`, updates);
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(`DELETE /api/v1/conversations/${conversationId}`);
      
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null;
      }
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    try {
      const response = await this.makeRequest<{ messages: AIMessage[] }>(`GET /api/v1/conversations/${conversationId}/messages`);
      return response.messages;
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  // Private helper methods
  private async makeRequest<T = any>(endpoint: string, body?: any): Promise<T> {
    const [method, path] = endpoint.split(' ');
    const url = `${this.baseUrl}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {},
    };

    // Only set Content-Type header if we're sending a body
    if ((method === 'POST' || method === 'PUT')) {
      (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    
    console.log('🌐 API Client: Making request:', {
      method,
      url,
      headers: options.headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const response = await fetch(url, options);
    
    console.log('📡 API Client: Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Client: Request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new AIManagerError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        this.mapHTTPStatusToErrorCode(response.status),
        errorData
      );
    }

    const responseData = await response.json();
    console.log('✅ API Client: Request successful:', {
      endpoint,
      responseData: typeof responseData === 'object' ? Object.keys(responseData) : typeof responseData
    });
    
    return responseData;
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('Client is destroyed'));
        return;
      }

      console.log('🔌 API Client: Connecting to WebSocket:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('✅ API Client: WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('onConnectionStatusChanged', true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 API Client: WebSocket message received:', data.type);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ API Client: Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 API Client: WebSocket closed:', event.code, event.reason);
        this.handleWebSocketClose();
      };

      this.ws.onerror = (error) => {
        console.error('❌ API Client: WebSocket error:', error);
        // Don't reject immediately for connection errors - let the onclose handler deal with reconnection
        // Only reject if this is during the initial connection attempt
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          reject(error);
        }
      };

      // Set a timeout for connection
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error('⏰ API Client: WebSocket connection timeout');
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  private handleWebSocketMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'connected':
        console.log('✅ API Client: Connected to WebSocket server');
        break;
        
      case 'subscribed':
        console.log('📡 API Client: Subscribed to conversation:', data.data.conversationId);
        break;
        
      case 'message':
        console.log('💬 API Client: Received message via WebSocket');
        this.emit('onMessageReceived', data.data.message);
        break;
        
      case 'error':
        console.error('❌ API Client: WebSocket error message:', data.data.error);
        // Don't emit this as a fatal error - it might be a server-side issue
        // that doesn't affect the client functionality
        if (data.data.error.includes('Cannot set headers after they are sent')) {
          console.warn('⚠️ API Client: Server-side header error detected - this is likely a server issue');
        } else {
          this.emit('onError', new Error(data.data.error));
        }
        break;
        
      case 'status_update':
        console.log('📊 API Client: Status update received');
        // Handle status updates if needed
        break;
        
      case 'tool_call':
        console.log('🔧 API Client: Tool call received');
        // Handle tool calls if needed
        break;
        
      default:
        console.log('❓ API Client: Unknown WebSocket message type:', data.type);
    }
  }

  private handleWebSocketClose(): void {
    if (this.isDestroyed) return;

    this.emit('onConnectionStatusChanged', false);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 API Client: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket().catch(error => {
          console.error('❌ API Client: Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ API Client: Max reconnection attempts reached');
    }
  }

  private emit(event: keyof AIManagerEvents, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  private handleAPIError(error: any): AIManagerError {
    if (error instanceof AIManagerError) {
      return error;
    }

    if (error instanceof Error) {
      return new AIManagerError(error.message, 'API_ERROR', error);
    }

    return new AIManagerError('Unknown API error', 'API_ERROR', error);
  }

  private mapHTTPStatusToErrorCode(status: number): string {
    switch (status) {
      case 401:
        return 'AUTH_ERROR';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 408:
        return 'TIMEOUT';
      case 413:
        return 'PAYLOAD_TOO_LARGE';
      case 429:
        return 'RATE_LIMIT';
      case 500:
        return 'SERVER_ERROR';
      default:
        return 'API_ERROR';
    }
  }
}

// Factory function to create API client
export function createAPIClient(baseUrl?: string): APIClient {
  const client = new APIClient(baseUrl);
  
  // Auto-initialize if environment variables are available
  const autoInitialize = async () => {
    try {
      // Check if we have an API key in environment or localStorage
      const apiKey = process.env.OPENROUTER_API_KEY || localStorage.getItem('openrouter_api_key');
      
      if (apiKey) {
        console.log('🔧 API Client: Auto-initializing with environment API key');
        const settings: AISettings = {
          apiKey,
          defaultModel: process.env.DEFAULT_MODEL || 'openai/gpt-3.5-turbo',
          maxTokens: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS) : undefined,
          temperature: process.env.TEMPERATURE ? parseFloat(process.env.TEMPERATURE) : undefined,
          topP: process.env.TOP_P ? parseFloat(process.env.TOP_P) : undefined
        };
        
        await client.initialize(settings);
        console.log('✅ API Client: Auto-initialized successfully');
      } else {
        console.log('ℹ️ API Client: No API key found, manual initialization required');
      }
    } catch (error) {
      console.error('❌ API Client: Auto-initialization failed:', error);
    }
  };
  
  // Run auto-initialization in the next tick to avoid blocking
  setTimeout(autoInitialize, 0);
  
  return client;
} 