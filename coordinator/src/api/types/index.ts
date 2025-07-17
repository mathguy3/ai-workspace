import { AIMessage, AIManagerStatus, AIModel } from "../../coordinator";
// API Request/Response Types
export interface CreateConversationRequest {
  model?: string;
  systemPrompt?: string;
}

export interface CreateConversationResponse {
  conversationId: string;
  model: string;
  systemPrompt?: string;
}

export interface SendMessageRequest {
  content: string;
  model?: string;
}

export interface SendMessageResponse {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface GetConversationResponse {
  conversationId: string;
  messages: AIMessage[];
  model: string;
  systemPrompt?: string;
  status: AIManagerStatus;
}

export interface ListConversationsResponse {
  conversations: Array<{
    conversationId: string;
    lastMessage?: string;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface GetModelsResponse {
  models: AIModel[];
}

export interface UpdateConversationRequest {
  model?: string;
  systemPrompt?: string;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface StatusUpdateEvent extends WebSocketEvent {
  type: 'status_update';
  data: {
    conversationId: string;
    status: AIManagerStatus;
    message?: string;
  };
}

export interface MessageEvent extends WebSocketEvent {
  type: 'message';
  data: {
    conversationId: string;
    message: AIMessage;
  };
}

export interface ToolCallEvent extends WebSocketEvent {
  type: 'tool_call';
  data: {
    conversationId: string;
    toolCall: {
      id: string;
      name: string;
      arguments: any;
    };
  };
}

export interface ErrorEvent extends WebSocketEvent {
  type: 'error';
  data: {
    conversationId: string;
    error: string;
    details?: any;
  };
}



// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  conversationId?: string;
  data?: any;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  conversationId: string;
}

export interface UnsubscribeMessage extends WebSocketMessage {
  type: 'unsubscribe';
  conversationId: string;
}

// Error Types
export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Middleware Types
export interface AuthenticatedRequest extends Request {
  conversationId?: string;
  userId?: string;
} 