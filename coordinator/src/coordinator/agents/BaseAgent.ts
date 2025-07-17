import { 
  Agent, 
  AgentMetadata, 
  AgentTool, 
  AgentTask, 
  AgentTaskResult, 
  AgentContext 
} from '../types/agent.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { AISettings } from '../types/index.js';

/**
 * Base Agent Class
 * Provides common functionality for all agents
 */
export abstract class BaseAgent implements Agent {
  protected metadata: AgentMetadata;
  protected tools: AgentTool[];
  protected status: 'idle' | 'working' | 'error' = 'idle';
  protected provider: OpenRouterProvider | null = null;
  protected settings: AISettings | null = null;

  constructor(metadata: AgentMetadata, tools: AgentTool[] = []) {
    this.metadata = metadata;
    this.tools = tools;
  }

  /**
   * Get agent metadata
   */
  getMetadata(): AgentMetadata {
    return { ...this.metadata };
  }

  /**
   * Get agent tools
   */
  getTools(): AgentTool[] {
    return [...this.tools];
  }

  /**
   * Get current status
   */
  getStatus(): 'idle' | 'working' | 'error' {
    return this.status;
  }

  /**
   * Check if agent can handle a specific task
   */
  canHandleTask(task: AgentTask): boolean {
    return this.metadata.supportedTaskTypes.includes(task.type);
  }

  /**
   * Execute a task - to be implemented by subclasses
   */
  abstract executeTask(task: AgentTask, context: AgentContext): Promise<AgentTaskResult>;

  /**
   * Initialize the agent with settings
   */
  async initialize(settings?: Record<string, unknown>): Promise<void> {
    try {
      this.status = 'working';
      
      if (settings?.aiSettings) {
        this.settings = settings.aiSettings as AISettings;
        this.provider = new OpenRouterProvider(this.settings);
        
        // Test connection
        const isConnected = await this.provider.testConnection();
        if (!isConnected) {
          throw new Error('Failed to connect to AI provider');
        }
      }
      
      // Call subclass initialization
      await this.onInitialize(settings);
      
      this.status = 'idle';
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    try {
      this.status = 'working';
      
      // Call subclass cleanup
      await this.onDestroy();
      
      this.provider = null;
      this.settings = null;
      this.status = 'idle';
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Get agent health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: string;
    lastCheck: Date;
  }> {
    try {
      if (this.status === 'error') {
        return {
          status: 'unhealthy',
          details: 'Agent is in error state',
          lastCheck: new Date()
        };
      }

      if (this.provider) {
        const isConnected = await this.provider.testConnection();
        if (!isConnected) {
          return {
            status: 'degraded',
            details: 'AI provider connection failed',
            lastCheck: new Date()
          };
        }
      }

      // Call subclass health check
      const health = await this.onHealthCheck();
      
      return {
        status: health?.status ?? 'healthy',
        details: health?.details,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Health check failed',
        lastCheck: new Date()
      };
    }
  }

  /**
   * Send message to AI provider
   */
  protected async sendToAI(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: Record<string, unknown>
  ): Promise<{ content: string; usage?: { totalTokens: number } }> {
    if (!this.provider) {
      throw new Error('AI provider not initialized');
    }

    const result = await this.provider.sendMessage(
      messages.map(msg => ({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date()
      })),
      options
    );

    return {
      content: result.message.content,
      usage: result.usage
    };
  }

  /**
   * Create a task result
   */
  protected createTaskResult(
    taskId: string,
    success: boolean,
    result: unknown,
    executionTime: number,
    error?: string,
    tokensUsed?: number,
    cost?: number,
    metadata?: Record<string, unknown>
  ): AgentTaskResult {
    return {
      taskId,
      agentId: this.metadata.id,
      success,
      result,
      error,
      executionTime,
      tokensUsed,
      cost,
      metadata
    };
  }

  /**
   * Subclass hooks - to be overridden by subclasses
   */
  protected async onInitialize(settings?: Record<string, unknown>): Promise<void> {
    // Override in subclasses if needed
  }

  protected async onDestroy(): Promise<void> {
    // Override in subclasses if needed
  }

  protected async onHealthCheck(): Promise<{
    status?: 'healthy' | 'degraded' | 'unhealthy';
    details?: string;
  } | undefined> {
    // Override in subclasses if needed
    return undefined;
  }
} 