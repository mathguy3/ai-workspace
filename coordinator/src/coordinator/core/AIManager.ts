import { 
  AIManager as IAIManager,
  AISettings,
  AIMessage,
  SendMessageOptions,
  SendMessageResult,
  AIModel,
  AIManagerEvents,
  AIManagerStatus,
  Conversation,
  ConversationSettings
} from '../types/index.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { StatusManager } from './StatusManager.js';
import { ConversationManager } from './ConversationManager.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { AgentCoordinator } from './AgentCoordinator.js';
import { Agent } from '../types/agent.js';

/**
 * Main AI Manager Implementation
 * Coordinates all components and provides the public interface
 */
export class AIManager implements IAIManager {
  private eventEmitter: EventEmitter;
  private statusManager: StatusManager;
  private conversationManager: ConversationManager;
  private provider: OpenRouterProvider | null = null;
  private agentCoordinator: AgentCoordinator | null = null;
  private settings: AISettings | null = null;
  private isInitialized = false;
  private usageStats = {
    totalTokens: 0,
    totalCost: 0,
    requests: 0
  };

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.statusManager = new StatusManager();
    this.conversationManager = new ConversationManager();
  }

  /**
   * Initialize the AI Manager with settings
   */
  async initialize(settings: AISettings): Promise<void> {
    try {
      this.statusManager.setStatus('connecting', 'Initializing AI Manager');
      
      this.settings = { ...settings };
      this.provider = new OpenRouterProvider(settings);
      
      // Initialize agent coordinator
      this.agentCoordinator = new AgentCoordinator(settings);
      await this.agentCoordinator.initialize(settings);
      
      // Test connection
      const isConnected = await this.provider.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to OpenRouter');
      }
      
      this.isInitialized = true;
      this.statusManager.setStatus('idle');
      
      this.eventEmitter.emit('onConnectionStatusChanged', true);
      this.eventEmitter.emit('onStatusChanged', 'idle');
      
    } catch (error) {
      this.statusManager.setStatus('error', error instanceof Error ? error.message : 'Initialization failed');
      this.eventEmitter.emit('onError', error instanceof Error ? error : new Error('Initialization failed'));
      this.eventEmitter.emit('onStatusChanged', 'error', error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    try {
      this.statusManager.setStatus('working', 'Cleaning up resources');
      
      this.eventEmitter.clear();
      this.conversationManager.clearAll();
      this.provider = null;
      this.agentCoordinator = null;
      this.settings = null;
      this.isInitialized = false;
      
      this.statusManager.reset();
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Send a message to the AI
   */
  async sendMessage(content: string, options: SendMessageOptions = {}): Promise<SendMessageResult> {
    if (!this.isInitialized || !this.agentCoordinator) {
      throw new Error('AI Manager not initialized');
    }

    try {
      this.statusManager.setStatus('thinking', 'Processing message');
      this.eventEmitter.emit('onStatusChanged', 'thinking', 'Processing message');

      // Create or get conversation
      const conversationId = options.conversationId ?? this.conversationManager.createConversation().id;
      const conversation = this.conversationManager.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Failed to create or retrieve conversation');
      }

      // Create user message
      const userMessage: AIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        role: 'user',
        timestamp: new Date()
      };

      // Add user message to conversation
      this.conversationManager.addMessage(conversationId, userMessage);

      // Send message through agent coordinator (which handles agent delegation)
      const result = await this.agentCoordinator.processMessageWithAgents(
        content,
        options,
        conversationId,
        (statusMessage: AIMessage) => {
          // Emit status updates as they happen
          this.eventEmitter.emit('onMessageReceived', statusMessage, conversationId);
        }
      );
      
      // Add assistant message to conversation
      this.conversationManager.addMessage(conversationId, result.message);
      
      // Update usage stats
      if (result.usage) {
        this.usageStats.totalTokens += result.usage.totalTokens;
        this.usageStats.requests += 1;
        // TODO: Calculate cost based on model pricing
      }

      // Emit events with conversation context
      //this.eventEmitter.emit('onMessageReceived', result.message, conversationId);
      this.statusManager.setStatus('idle');
      this.eventEmitter.emit('onStatusChanged', 'idle', undefined, conversationId);

      return {
        ...result,
        conversationId
      };

    } catch (error) {
      this.statusManager.setStatus('error', error instanceof Error ? error.message : 'Message failed');
      this.eventEmitter.emit('onError', error instanceof Error ? error : new Error('Message failed'), options.conversationId);
      this.eventEmitter.emit('onStatusChanged', 'error', error instanceof Error ? error.message : 'Message failed', options.conversationId);
      throw error;
    }
  }

  /**
   * Update settings
   */
  async updateSettings(settings: Partial<AISettings>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AI Manager not initialized');
    }

    this.settings = { ...this.settings!, ...settings };
    
    if (this.provider) {
      this.provider.updateSettings(this.settings);
    }
    
    if (this.agentCoordinator) {
      await this.agentCoordinator.initialize(this.settings);
    }
  }

  /**
   * Register an agent with the AI Manager
   */
  registerAgent(agent: Agent): void {
    if (!this.agentCoordinator) {
      throw new Error('AI Manager not initialized');
    }
    this.agentCoordinator.registerAgent(agent);
  }

  /**
   * Unregister an agent from the AI Manager
   */
  unregisterAgent(agentId: string): void {
    if (!this.agentCoordinator) {
      throw new Error('AI Manager not initialized');
    }
    this.agentCoordinator.unregisterAgent(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    if (!this.agentCoordinator) {
      throw new Error('AI Manager not initialized');
    }
    return this.agentCoordinator.getAllAgents();
  }

  /**
   * Get agent metadata
   */
  getAgentMetadata() {
    if (!this.agentCoordinator) {
      throw new Error('AI Manager not initialized');
    }
    return this.agentCoordinator.getAgentMetadata();
  }

  /**
   * Get current settings
   */
  getSettings(): AISettings {
    if (!this.settings) {
      throw new Error('AI Manager not initialized');
    }
    return { ...this.settings };
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<AIModel[]> {
    if (!this.provider) {
      throw new Error('AI Manager not initialized');
    }

    try {
      const models = await this.provider.getAvailableModels();
      this.eventEmitter.emit('onModelsUpdated', models);
      return models;
    } catch (error) {
      this.eventEmitter.emit('onError', error instanceof Error ? error : new Error('Failed to fetch models'));
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  async getModelById(id: string): Promise<AIModel | null> {
    if (!this.provider) {
      throw new Error('AI Manager not initialized');
    }
    return this.provider.getModelById(id);
  }

  /**
   * Filter models by criteria
   */
  async filterModels(criteria: {
    provider?: string;
    capabilities?: string[];
    maxContextLength?: number;
  }): Promise<AIModel[]> {
    const models = await this.getAvailableModels();
    
    return models.filter(model => {
      if (criteria.provider && model.provider !== criteria.provider) {
        return false;
      }
      
      if (criteria.maxContextLength && model.contextLength && model.contextLength > criteria.maxContextLength) {
        return false;
      }
      
      if (criteria.capabilities && model.capabilities) {
        const hasAllCapabilities = criteria.capabilities.every(cap => 
          model.capabilities!.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Event handling
   */
  on<K extends keyof AIManagerEvents>(event: K, callback: AIManagerEvents[K]): void {
    this.eventEmitter.on(event, callback);
  }

  off<K extends keyof AIManagerEvents>(event: K, callback: AIManagerEvents[K]): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.isInitialized && this.provider !== null;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }
    
    try {
      const connected = await this.provider.testConnection();
      this.eventEmitter.emit('onConnectionStatusChanged', connected);
      return connected;
    } catch {
      this.eventEmitter.emit('onConnectionStatusChanged', false);
      return false;
    }
  }

  /**
   * Get current status
   */
  getStatus(): AIManagerStatus {
    return this.statusManager.getStatus();
  }

  /**
   * Get status details
   */
  getStatusDetails(): string | undefined {
    return this.statusManager.getStatusDetails();
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!this.provider) {
      return false;
    }
    return this.provider.validateApiKey(apiKey);
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requests: number;
  }> {
    return { ...this.usageStats };
  }

  /**
   * Create a new conversation
   */
  async createConversation(settings?: ConversationSettings): Promise<Conversation> {
    const conversation = this.conversationManager.createConversation(undefined, settings);
    this.eventEmitter.emit('onConversationCreated', conversation.id, settings);
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversationManager.getConversation(id);
  }

  /**
   * List all conversations
   */
  async listConversations(): Promise<Conversation[]> {
    return this.conversationManager.listConversations();
  }

  /**
   * Delete conversation
   */
  async deleteConversation(id: string): Promise<void> {
    this.conversationManager.deleteConversation(id);
    this.eventEmitter.emit('onConversationDeleted', id);
  }

  /**
   * Update conversation settings
   */
  async updateConversationSettings(conversationId: string, settings: Partial<ConversationSettings>): Promise<void> {
    const success = this.conversationManager.updateSettings(conversationId, settings);
    if (!success) {
      throw new Error('Conversation not found');
    }
    this.eventEmitter.emit('onConversationUpdated', conversationId, settings);
  }

  /**
   * Get conversation settings
   */
  async getConversationSettings(conversationId: string): Promise<ConversationSettings | null> {
    return this.conversationManager.getSettings(conversationId);
  }
} 