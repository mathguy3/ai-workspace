// Enhanced AI Manager Types with Status Management
// This defines the contract for the external AI management library

export type AIManagerStatus = 'idle' | 'thinking' | 'working' | 'error' | 'connecting';

export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  model?: string;
  metadata?: {
    toolCalls?: ToolCall[];
    processingTime?: number;
    [key: string]: unknown;
  };
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
  supportsTools?: boolean;
}

export interface AISettings {
  apiKey: string;
  defaultModel: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  baseUrl?: string; // For OpenRouter
  timeout?: number;
  retryAttempts?: number;
}

// Conversation-specific settings
export interface ConversationSettings {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  metadata?: Record<string, unknown>;
}

export interface SendMessageOptions {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  conversationId?: string; // For conversation continuity
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: 'auto' | 'none' | {
    type: 'function';
    function: {
      name: string;
    };
  };
}

export interface SendMessageResult {
  message: AIMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  conversationId?: string;
}

// Enhanced events with conversation context
export interface AIManagerEvents {
  onMessageReceived: (message: AIMessage, conversationId: string) => void;
  onError: (error: Error, conversationId?: string) => void;
  onConnectionStatusChanged: (connected: boolean) => void;
  onModelsUpdated: (models: AIModel[]) => void;
  onStatusChanged: (status: AIManagerStatus, details?: string, conversationId?: string) => void;
  onConversationCreated: (conversationId: string, settings?: ConversationSettings) => void;
  onConversationUpdated: (conversationId: string, settings: Partial<ConversationSettings>) => void;
  onConversationDeleted: (conversationId: string) => void;
}

// Tool-related types (opaque to consumers)
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  result: unknown;
  error?: string;
}

// Enhanced conversation management with settings
export interface Conversation {
  id: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ConversationSettings;
  metadata?: Record<string, unknown>;
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
  getSettings(): AISettings;
  
  // Conversation settings management
  updateConversationSettings(conversationId: string, settings: Partial<ConversationSettings>): Promise<void>;
  getConversationSettings(conversationId: string): Promise<ConversationSettings | null>;
  
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
  
  // Status management
  getStatus(): AIManagerStatus;
  getStatusDetails(): string | undefined;
  
  // Utility methods
  validateApiKey(apiKey: string): Promise<boolean>;
  getUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requests: number;
  }>;
  
  // Conversation management
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;
  createConversation(settings?: ConversationSettings): Promise<Conversation>;
  
  // Agent management
  registerAgent(agent: import('../types/agent.js').Agent): void;
  unregisterAgent(agentId: string): void;
  getAllAgents(): import('../types/agent.js').Agent[];
  getAgentMetadata(): import('../types/agent.js').AgentMetadata[];
}

// Error types
export class AIManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
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

export class ConnectionError extends AIManagerError {
  constructor(message: string = 'Connection failed') {
    super(message, 'CONNECTION_ERROR');
  }
}

export class ToolExecutionError extends AIManagerError {
  constructor(message: string = 'Tool execution failed') {
    super(message, 'TOOL_EXECUTION_ERROR');
  }
} 