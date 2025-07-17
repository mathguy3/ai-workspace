import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ElectronAPIProvider } from './contexts/ElectronAPIContext';
import { AIManager, AIMessage, AIModel, AISettings, SendMessageResult } from '../shared/types/ai-manager';
import './index.css';

// Import the API client and configuration
import { createAPIClient } from '../shared/utils/api-client';
import { config, getAIManagerMode } from '../shared/config';

// Create API client instance
const apiClient = createAPIClient(config.apiServer.baseUrl);

// For development/testing, you can still use the mock if the API server is not running
const eventHandlers: { event: string; callback: Function }[] = [];
const mockAIManager: AIManager = {
  initialize: async (settings: AISettings) => {
    console.log('Mock AI Manager initialized with settings1:', settings);
    console.log('eventHandlers', eventHandlers);
    setTimeout(() => {
      console.log('Mock AI Manager initialized with settings1234:', settings);
      console.log('eventHandlers', eventHandlers);
      eventHandlers.find(handler => handler.event === 'onConnectionStatusChanged')?.callback(true);
    }, 1000);
  },
  
  destroy: async () => {
    console.log('Mock AI Manager destroyed');
  },
  
  sendMessage: async (content: string, options?: any): Promise<SendMessageResult> => {
    console.log('Mock AI Manager sending message:', content);
    // Simulate a response
    const mockResponse: AIMessage = {
      id: Date.now().toString(),
      content: `Mock response to: "${content}"`,
      role: 'assistant',
      timestamp: new Date(),
      model: 'mock-model'
    };

    setTimeout(() => {
      eventHandlers.find(handler => handler.event === 'onMessageReceived')?.callback(mockResponse);
    }, 1000);
    
    return {
      message: mockResponse,
      usage: {
        promptTokens: content.length,
        completionTokens: mockResponse.content.length,
        totalTokens: content.length + mockResponse.content.length
      }
    };
  },
  
  updateSettings: async (settings: Partial<AISettings>) => {
    console.log('Mock AI Manager updating settings:', settings);
  },
  
  getSettings: async (): Promise<AISettings> => {
    return {
      apiKey: 'mock-api-key',
      defaultModel: 'mock-model'
    };
  },
  
  getAvailableModels: async (): Promise<AIModel[]> => {
    return [
      {
        id: 'mock-model-1',
        name: 'Mock Model 1 (Free)',
        provider: 'Mock Provider',
        contextLength: 4096,
        capabilities: ['text-generation', 'chat'],
        pricing: {
          input: 0,
          output: 0
        }
      },
      {
        id: 'mock-model-2',
        name: 'Mock Model 2 (Paid)',
        provider: 'Mock Provider',
        contextLength: 8192,
        capabilities: ['text-generation', 'chat', 'code-generation'],
        pricing: {
          input: 0.001,
          output: 0.002
        }
      },
      {
        id: 'mock-model-3',
        name: 'Mock Model 3 (Free + Tools)',
        provider: 'Mock Provider',
        contextLength: 16384,
        capabilities: ['text-generation', 'chat', 'tools'],
        pricing: {
          input: 0,
          output: 0
        }
      },
      {
        id: 'mock-model-4',
        name: 'Mock Model 4 (Paid + Tools)',
        provider: 'Mock Provider',
        contextLength: 32768,
        capabilities: ['text-generation', 'chat', 'code-generation', 'tools'],
        pricing: {
          input: 0.003,
          output: 0.006
        }
      }
    ];
  },
  
  getModelById: async (id: string): Promise<AIModel | null> => {
    const models = await mockAIManager.getAvailableModels();
    return models.find(model => model.id === id) || null;
  },
  
  filterModels: async (criteria: any): Promise<AIModel[]> => {
    const models = await mockAIManager.getAvailableModels();
    return models.filter(model => {
      if (criteria.provider && model.provider !== criteria.provider) return false;
      if (criteria.capabilities) {
        return criteria.capabilities.every((cap: string) => 
          model.capabilities?.includes(cap)
        );
      }
      return true;
    });
  },
  
  on: (event: string, callback: Function) => {
    eventHandlers.push({ event, callback });
    console.log('Mock AI Manager event listener added:', event);
  },
  
  off: (event: string, callback: Function) => {
    console.log('Mock AI Manager event listener removed:', event);
  },
  
  isConnected: () => {
    return true; // Mock is always connected
  },
  
  testConnection: async () => {
    return true; // Mock connection test always succeeds
  },
  
  validateApiKey: async (apiKey: string): Promise<boolean> => {
    return apiKey.length > 0; // Mock validation
  },
  
  getUsageStats: async () => {
    return {
      totalTokens: 1000,
      totalCost: 0.002,
      requests: 10
    };
  },
  
  // Conversation management methods
  createConversation: async (options?: { model?: string; systemPrompt?: string }): Promise<string> => {
    return `conv_${Date.now()}_mock`;
  },
  
  getConversations: async (): Promise<any[]> => {
    return [];
  },
  
  getConversation: async (conversationId: string): Promise<any> => {
    return {
      conversationId,
      messages: [],
      model: 'mock-model',
      systemPrompt: 'You are a helpful assistant.',
      status: 'idle'
    };
  },
  
  updateConversation: async (conversationId: string, updates: any): Promise<void> => {
    console.log('Mock update conversation:', conversationId, updates);
  },
  
  deleteConversation: async (conversationId: string): Promise<void> => {
    console.log('Mock delete conversation:', conversationId);
  },
  
  getMessages: async (conversationId: string): Promise<AIMessage[]> => {
    return [];
  }
};

// Choose which AI manager to use based on configuration
const aiManagerMode = getAIManagerMode();
const aiManager = aiManagerMode === 'api' ? apiClient : mockAIManager;

const root = ReactDOM.createRoot(document.getElementById('root')!);
console.log('Using AI Manager:', aiManagerMode);
root.render(
  <React.StrictMode>
    <ElectronAPIProvider api={aiManager}>
      <App />
    </ElectronAPIProvider>
  </React.StrictMode>
); 