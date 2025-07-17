import { Router, Request, Response } from 'express';
import { AIManager } from '../../coordinator';
import { 
  CreateConversationRequest, 
  CreateConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetConversationResponse,
  ListConversationsResponse,
  UpdateConversationRequest,
  APIError
} from '../types';
import { WebSocketManager } from '../websocket/manager';
import { 
  validateCreateConversation,
  validateSendMessage,
  validateUpdateConversation,
  validateConversationId
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';

export class ConversationsRoutes {
  private router: Router;
  private aiManager: AIManager;
  private wsManager: WebSocketManager;

  constructor(aiManager: AIManager, wsManager: WebSocketManager) {
    this.router = Router();
    this.aiManager = aiManager;
    this.wsManager = wsManager;
    this.setupRoutes();
    this.setupEventListeners();
  }

  private setupRoutes(): void {
    // Create a new conversation
    this.router.post('/', validateCreateConversation, asyncHandler(this.createConversation.bind(this)));
    
    // List all conversations
    this.router.get('/', asyncHandler(this.listConversations.bind(this)));
    
    // Get a specific conversation
    this.router.get('/:conversationId', validateConversationId, asyncHandler(this.getConversation.bind(this)));
    
    // Update conversation settings
    this.router.put('/:conversationId', validateConversationId, validateUpdateConversation, asyncHandler(this.updateConversation.bind(this)));
    
    // Delete a conversation
    this.router.delete('/:conversationId', validateConversationId, asyncHandler(this.deleteConversation.bind(this)));
    
    // Send a message to a conversation
    this.router.post('/:conversationId/messages', validateConversationId, validateSendMessage, asyncHandler(this.sendMessage.bind(this)));
    
    // Get messages from a conversation
    this.router.get('/:conversationId/messages', validateConversationId, asyncHandler(this.getMessages.bind(this)));
  }

  private setupEventListeners(): void {
    // Listen to AI Manager events and broadcast to WebSocket clients with conversation context
    this.aiManager.on('onStatusChanged', (status, details, conversationId) => {
      if (conversationId) {
        // Broadcast to specific conversation
        this.wsManager.broadcastStatusUpdate(conversationId, status, details);
      } else {
        // Broadcast to all active conversations for global status changes
        const conversations = this.aiManager.listConversations();
        conversations.then(conversations => {
          conversations.forEach(conversation => {
            this.wsManager.broadcastStatusUpdate(conversation.id, status, details);
          });
        });
      }
    });

    this.aiManager.on('onMessageReceived', (message, conversationId) => {
      // Broadcast message to the specific conversation
      this.wsManager.broadcastMessage(conversationId, message);
    });

    this.aiManager.on('onError', (error, conversationId) => {
      if (conversationId) {
        // Broadcast error to specific conversation
        this.wsManager.broadcastError(conversationId, error.message, error);
      } else {
        // Broadcast to all active conversations for global errors
        const conversations = this.aiManager.listConversations();
        conversations.then(conversations => {
          conversations.forEach(conversation => {
            this.wsManager.broadcastError(conversation.id, error.message, error);
          });
        });
      }
    });

    // Listen to conversation lifecycle events
    this.aiManager.on('onConversationCreated', (conversationId, settings) => {
      if (this.wsManager) {
        this.wsManager.broadcastConversationEvent(conversationId, 'created', { settings });
      }
    });

    this.aiManager.on('onConversationUpdated', (conversationId, settings) => {
      if (this.wsManager) {
        this.wsManager.broadcastConversationEvent(conversationId, 'updated', { settings });
      }
    });

    this.aiManager.on('onConversationDeleted', (conversationId) => {
      if (this.wsManager) {
        this.wsManager.broadcastConversationEvent(conversationId, 'deleted', {});
      }
    });
  }

  private async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const { model, systemPrompt }: CreateConversationRequest = req.body;
      
      // Create conversation with settings
      const settings = {
        ...(model && { model }),
        ...(systemPrompt && { systemPrompt })
      };
      
      const conversation = await this.aiManager.createConversation(Object.keys(settings).length > 0 ? settings : undefined);

      const response: CreateConversationResponse = {
        conversationId: conversation.id,
        model: conversation.settings?.model || this.aiManager.getSettings().defaultModel,
        ...(conversation.settings?.systemPrompt && { systemPrompt: conversation.settings.systemPrompt })
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to create conversation');
    }
  }

  private async listConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await this.aiManager.listConversations();
      
      const response: ListConversationsResponse = {
        conversations: conversations.map(conv => ({
          conversationId: conv.id,
          ...(conv.messages.length > 0 && { lastMessage: conv.messages[conv.messages.length - 1]?.content || '' }),
          messageCount: conv.messages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }))
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to list conversations');
    }
  }

  private async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const conversation = await this.aiManager.getConversation(conversationId);
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const response: GetConversationResponse = {
        conversationId: conversation.id,
        messages: conversation.messages,
        model: this.aiManager.getSettings().defaultModel, // TODO: Store model per conversation
        ...(conversation.settings?.systemPrompt && { systemPrompt: conversation.settings.systemPrompt }),
        status: this.aiManager.getStatus()
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to get conversation');
    }
  }

  private async updateConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { model, systemPrompt }: UpdateConversationRequest = req.body;
      
      const conversation = await this.aiManager.getConversation(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Update conversation-specific settings
      const settings = {
        ...(model && { model }),
        ...(systemPrompt && { systemPrompt })
      };

      if (Object.keys(settings).length > 0) {
        await this.aiManager.updateConversationSettings(conversationId, settings);
      }

      res.json({ message: 'Conversation updated successfully' });
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to update conversation');
    }
  }

  private async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      const conversation = await this.aiManager.getConversation(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      await this.aiManager.deleteConversation(conversationId);
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to delete conversation');
    }
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { content, model }: SendMessageRequest = req.body;
      
      if (!content) {
        res.status(400).json({ error: 'Message content is required' });
        return;
      }

      // Verify conversation exists
      const conversation = await this.aiManager.getConversation(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Broadcast status update before sending message
      if (this.wsManager) {
        //this.wsManager.broadcastStatusUpdate(conversationId, 'thinking', 'Processing your message...');
      }

      // Send message to AI
      const result = await this.aiManager.sendMessage(content, {
        conversationId,
        ...(model && { model })
      });

      const response: SendMessageResponse = {
        messageId: result.message.id,
        content: result.message.content,
        role: result.message.role === 'system' ? 'assistant' : result.message.role,
        timestamp: result.message.timestamp
      };

      // Broadcast the new message to WebSocket clients
      if (this.wsManager) {
        //this.wsManager.broadcastMessage(conversationId, result.message);
      }

      res.json(response);
    } catch (error) {
      const { conversationId } = req.params;
      if (this.wsManager) {
        this.wsManager.broadcastError(conversationId, error instanceof Error ? error.message : 'Failed to send message');
      }
      this.handleError(res, error as Error, 'Failed to send message');
    }
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const conversation = await this.aiManager.getConversation(conversationId);
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.json({ messages: conversation.messages });
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to get messages');
    }
  }

  private handleError(res: Response, error: Error, defaultMessage: string): void {
    console.error('API Error:', error);
    
    const apiError: APIError = {
      error: 'Internal Server Error',
      message: error.message || defaultMessage,
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    res.status(500).json(apiError);
  }

  public getRouter(): Router {
    return this.router;
  }

  public setWebSocketManager(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }
} 