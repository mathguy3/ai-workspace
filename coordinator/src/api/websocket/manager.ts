import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { 
  WebSocketEvent, 
  StatusUpdateEvent, 
  MessageEvent, 
  ToolCallEvent, 
  ErrorEvent, 
  SubscribeMessage,
  UnsubscribeMessage,
  WebSocketMessage
} from '../types';
import { AIMessage, AIManagerStatus } from '../../coordinator';

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // conversationId -> Set of clientIds

  constructor(server: any, path: string = '/ws') {
    super();
    this.wss = new WebSocketServer({ server, path });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.removeClient(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket client error (${clientId}):`, error);
        this.removeClient(clientId);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        data: { clientId },
        timestamp: new Date()
      });
    });
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message as SubscribeMessage);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message as UnsubscribeMessage);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(clientId: string, message: SubscribeMessage): void {
    const { conversationId } = message;
    
    if (!this.subscriptions.has(conversationId)) {
      this.subscriptions.set(conversationId, new Set());
    }
    
    this.subscriptions.get(conversationId)!.add(clientId);
    
    const ws = this.clients.get(clientId);
    if (ws) {
      this.sendToClient(ws, {
        type: 'subscribed',
        data: { conversationId },
        timestamp: new Date()
      });
    }
    
    console.log(`Client ${clientId} subscribed to conversation ${conversationId}`);
  }

  private handleUnsubscribe(clientId: string, message: UnsubscribeMessage): void {
    const { conversationId } = message;
    
    const subscription = this.subscriptions.get(conversationId);
    if (subscription) {
      subscription.delete(clientId);
      if (subscription.size === 0) {
        this.subscriptions.delete(conversationId);
      }
    }
    
    const ws = this.clients.get(clientId);
    if (ws) {
      this.sendToClient(ws, {
        type: 'unsubscribed',
        data: { conversationId },
        timestamp: new Date()
      });
    }
    
    console.log(`Client ${clientId} unsubscribed from conversation ${conversationId}`);
  }

  private removeClient(clientId: string): void {
    // Remove client from all subscriptions
    for (const [conversationId, subscribers] of this.subscriptions.entries()) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(conversationId);
      }
    }
    
    this.clients.delete(clientId);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToClient(ws: WebSocket, event: WebSocketEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendToClient(ws, {
      type: 'error',
      data: { error },
      timestamp: new Date()
    });
  }

  // Public methods for broadcasting events
  public broadcastStatusUpdate(conversationId: string, status: AIManagerStatus, message?: string): void {
    const event: StatusUpdateEvent = {
      type: 'status_update',
      data: { conversationId, status, ...(message && { message }) },
      timestamp: new Date()
    };
    this.broadcastToConversation(conversationId, event);
  }

  public broadcastMessage(conversationId: string, message: AIMessage): void {
    const event: MessageEvent = {
      type: 'message',
      data: { conversationId, message },
      timestamp: new Date()
    };
    this.broadcastToConversation(conversationId, event);
  }

  public broadcastToolCall(conversationId: string, toolCall: { id: string; name: string; arguments: any }): void {
    const event: ToolCallEvent = {
      type: 'tool_call',
      data: { conversationId, toolCall },
      timestamp: new Date()
    };
    this.broadcastToConversation(conversationId, event);
  }

  public broadcastError(conversationId: string, error: string, details?: any): void {
    const event: ErrorEvent = {
      type: 'error',
      data: { conversationId, error, details },
      timestamp: new Date()
    };
    this.broadcastToConversation(conversationId, event);
  }

  public broadcastConversationEvent(conversationId: string, eventType: 'created' | 'updated' | 'deleted', data: any): void {
    const event: WebSocketEvent = {
      type: `conversation_${eventType}`,
      data: { conversationId, ...data },
      timestamp: new Date()
    };
    this.broadcastToConversation(conversationId, event);
  }



  private broadcastToConversation(conversationId: string, event: WebSocketEvent): void {
    const subscribers = this.subscriptions.get(conversationId);
    if (!subscribers) return;

    const eventData = JSON.stringify(event);
    
    for (const clientId of subscribers) {
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(eventData);
      }
    }
  }

  public getStats(): { clients: number; subscriptions: number } {
    return {
      clients: this.clients.size,
      subscriptions: this.subscriptions.size
    };
  }

  public close(): void {
    this.wss.close();
  }
} 