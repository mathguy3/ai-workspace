// AI Manager Library Interface
// This defines the contract for the external AI management library

export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  model?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  capabilities?: string[];
  pricing?: {
    input: number; // cost per 1K tokens
    output: number; // cost per 1K tokens
  };
}

export interface AISettings {
  apiKey: string;
  defaultModel: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface SendMessageOptions {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface SendMessageResult {
  message: AIMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// API-specific types
export interface APIConversation {
  conversationId: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface APIConversationDetails {
  conversationId: string;
  messages: AIMessage[];
  model: string;
  systemPrompt: string;
  status: string;
}

export interface UpdateConversationRequest {
  model?: string;
  systemPrompt?: string;
}

export interface AIManagerEvents {
  onMessageReceived: (message: AIMessage) => void;
  onError: (error: Error) => void;
  onConnectionStatusChanged: (connected: boolean) => void;
  onModelsUpdated: (models: AIModel[]) => void;
}

// Main AI Manager Interface
export interface AIManager {
  // Initialization and lifecycle
  initialize(settings: AISettings): Promise<void>;
  destroy(): Promise<void>;
  
  // Message handling
  sendMessage(content: string, options?: SendMessageOptions): Promise<SendMessageResult>;
  
  // Settings management
  updateSettings(settings: Partial<AISettings>): Promise<void>;
  getSettings(): Promise<AISettings>;
  
  // Model management
  getAvailableModels(): Promise<AIModel[]>;
  getModelById(id: string): Promise<AIModel | null>;
  filterModels(criteria: {
    provider?: string;
    capabilities?: string[];
    maxContextLength?: number;
  }): Promise<AIModel[]>;
  
  // Event handling
  on(event: keyof AIManagerEvents, callback: AIManagerEvents[keyof AIManagerEvents]): void;
  off(event: keyof AIManagerEvents, callback: AIManagerEvents[keyof AIManagerEvents]): void;
  
  // Connection status
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
  
  // Utility methods
  validateApiKey(apiKey: string): Promise<boolean>;
  getUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requests: number;
  }>;
  
  // Conversation management (API-specific)
  createConversation(options?: { model?: string; systemPrompt?: string }): Promise<string>;
  getConversations(): Promise<APIConversation[]>;
  getConversation(conversationId: string): Promise<APIConversationDetails>;
  updateConversation(conversationId: string, updates: UpdateConversationRequest): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;
  getMessages(conversationId: string): Promise<AIMessage[]>;
}

// Error types
export class AIManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIManagerError';
  }
}

export class AuthenticationError extends AIManagerError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
  }
}

export class ModelNotFoundError extends AIManagerError {
  constructor(modelId: string) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
  }
}

export class RateLimitError extends AIManagerError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT');
  }
} 