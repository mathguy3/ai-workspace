import { 
  Agent, 
  AgentTask, 
  AgentContext, 
  TaskDelegationResult,
  MCPToolCall,
  MCPToolResult
} from '../types/agent.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { MCPDelegationTool } from '../tools/MCPDelegationTool.js';
import { TaskManager } from '../tools/TaskManager.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { AISettings, AIMessage, SendMessageOptions, SendMessageResult } from '../types/index.js';
import { CodeAnalysisAgent } from '../agents/CodeAnalysisAgent.js';

/**
 * Agent Coordinator
 * Integrates agent system with the main AI Manager
 */
export class AgentCoordinator {
  private agentRegistry: AgentRegistry;
  private taskManager: TaskManager;
  private mcpTool: MCPDelegationTool;
  private provider: OpenRouterProvider | null = null;
  private settings: AISettings | null = null;

  constructor(aiSettings?: AISettings) {
    this.agentRegistry = new AgentRegistry();
    this.taskManager = new TaskManager(aiSettings);
    this.mcpTool = new MCPDelegationTool(this.agentRegistry, this.taskManager);
    
    if (aiSettings) {
      this.settings = aiSettings;
      this.provider = new OpenRouterProvider(aiSettings);
      // Note: Built-in agents will be registered when initialize() is called
    }
  }

  /**
   * Initialize the coordinator
   */
  async initialize(settings: AISettings): Promise<void> {
    this.settings = settings;
    this.provider = new OpenRouterProvider(settings);
    this.taskManager.updateAISettings(settings);
    
    // Register built-in agents
    await this.registerBuiltInAgents();
  }

  /**
   * Register built-in agents that come with the coordinator
   */
  private async registerBuiltInAgents(): Promise<void> {
    // Register Code Analysis Agent
    const codeAnalysisAgent = new CodeAnalysisAgent();
    await codeAnalysisAgent.initialize({ aiSettings: this.settings! });
    this.registerAgent(codeAnalysisAgent);
    
    // TODO: Add more built-in agents here as they are created
    // Examples:
    // - DataAnalysisAgent
    // - WebSearchAgent
    // - FileProcessingAgent
    // - MathAgent
  }

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    this.agentRegistry.registerAgent(agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agentRegistry.unregisterAgent(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return this.agentRegistry.getAllAgents();
  }

  /**
   * Get agent metadata
   */
  getAgentMetadata() {
    return this.agentRegistry.getAgentMetadata();
  }

  /**
   * Process a user message with agent delegation capabilities
   */
  async processMessageWithAgents(
    content: string, 
    options: SendMessageOptions = {},
    conversationId?: string,
    emitMessage?: (message: AIMessage) => void
  ): Promise<SendMessageResult> {
    if (!this.provider) {
      throw new Error('Agent Coordinator not initialized');
    }

    // Create context for the conversation
    const context: AgentContext = {
      taskId: `conv_${conversationId ?? Date.now()}`,
      conversationId,
      userContext: { message: content }
    };

    // Emit initial status
    if (emitMessage) {
      emitMessage({
        id: `status_${Date.now()}`,
        role: 'assistant',
        content: '🤔 Analyzing your request and determining if specialized agents are needed...',
        timestamp: new Date()
      });
    }

    // Prepare messages for the AI
    const messages: AIMessage[] = [
      {
        id: `sys_${Date.now()}`,
        role: 'system',
        content: this.getSystemPrompt(),
        timestamp: new Date()
      },
      {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      }
    ];

    console.log('systemPrompt', this.getSystemPrompt());

    // Add conversation history if available
    if (options.conversationId) {
      // TODO: Add conversation history from conversation manager
    }

    // Emit AI processing status
    if (emitMessage) {
      emitMessage({
        id: `status_${Date.now()}`,
        role: 'assistant',
        content: '🧠 Consulting with AI coordinator to determine the best approach...',
        timestamp: new Date()
      });
    }

    // Send to AI with MCP tool available
    const result = await this.provider.sendMessage(messages, {
      ...options,
      tools: [this.mcpTool.getToolDefinition()],
      tool_choice: 'auto'
    });

    console.log('result', result);
    if (emitMessage) {
      emitMessage({
        id: `status_${Date.now()}`,
        role: 'assistant',
        content: JSON.stringify(result.message),
        timestamp: new Date()
      });
    }
    // Check if the AI wants to delegate tasks
    if (result.message.metadata?.toolCalls && result.message.metadata.toolCalls.length > 0) {
      // Emit delegation status
      if (emitMessage) {
        emitMessage({
          id: `status_${Date.now()}`,
          role: 'assistant',
          content: '🔄 Delegating task to specialized agent...',
          timestamp: new Date()
        });
      }

      // Process tool calls (task delegations)
      const delegationResults = await this.processToolCalls(
        result.message.metadata.toolCalls.map(tc => ({
          name: tc.name,
          arguments: tc.arguments
        })) as MCPToolCall[],
        context,
        emitMessage
      );

      // Emit summarization status
      if (emitMessage) {
        emitMessage({
          id: `status_${Date.now()}`,
          role: 'assistant',
          content: '📝 Summarizing agent results and preparing final response...',
          timestamp: new Date()
        });
      }

      // Generate final response with delegation results
      const finalResponse = await this.generateFinalResponse(
        content,
        result.message.content,
        delegationResults,
        context
      );

      return {
        ...result,
        message: {
          ...result.message,
          content: finalResponse
        }
      };
    } else {
      // Emit direct response status
      if (emitMessage) {
        emitMessage({
          id: `status_${Date.now()}`,
          role: 'assistant',
          content: '💬 Providing direct response...',
          timestamp: new Date()
        });
      }
    }

    return result;
  }

  /**
   * Delegate a task directly to agents
   */
  async delegateTask(
    task: AgentTask, 
    context: AgentContext
  ): Promise<TaskDelegationResult> {
    const agents = this.agentRegistry.findAgentsForTask(task);
    return this.taskManager.delegateTask(task, agents, context);
  }

  /**
   * Get MCP tool for integration
   */
  getMCPTool() {
    return this.mcpTool;
  }

  /**
   * Get system prompt for agent-aware conversations
   */
  private getSystemPrompt(): string {
    const availableAgents = this.agentRegistry.getAgentMetadata();
    const agentDescriptions = availableAgents.map(agent => 
      `- ${agent.name} (${agent.id}): ${agent.description} - Supports: ${agent.supportedTaskTypes.join(', ')}`
    ).join('\n');

    return `You are an AI coordinator that can delegate tasks to specialized agents.

Available Agents:
${agentDescriptions}

When a user request requires specialized analysis or processing, you can use the delegate_task tool to hand off work to the most appropriate agent. 

Guidelines:
1. Analyze the user's request to identify if it requires specialized processing
2. Choose the single most appropriate agent for the task from the available agents
3. Use delegate_task with the specific agentId for tasks that match the supported types
4. Provide clear, specific task descriptions when delegating
5. Summarize and explain the results from agent executions
6. For simple questions or general conversation, respond directly without delegation

IMPORTANT: When delegating to the Code Analysis Agent, use these exact parameter names:
- For code analysis tasks: use "code" (not "code_snippet") and "language"
- Example: {"code": "your code here", "language": "JavaScript"}

CRITICAL: All tool arguments must be valid JSON. Ensure:
- All property names are quoted: "agentId" not agentId
- All string values are quoted: "code_analysis" not code_analysis
- No trailing commas
- Proper JSON syntax

Task Types Available:
${Array.from(new Set(availableAgents.flatMap(a => a.supportedTaskTypes))).join(', ')}

Always be helpful and provide clear explanations of what you're doing and why.`;
  }

  /**
   * Process MCP tool calls (task delegations)
   */
  private async processToolCalls(
    toolCalls: MCPToolCall[], 
    context: AgentContext,
    emitMessage?: (message: AIMessage) => void
  ): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    for (const toolCall of toolCalls) {
      if (toolCall.name === 'delegate_task') {
        // Emit agent selection status
        if (emitMessage) {
          const agentId = toolCall.arguments.agentId;
          const agent = this.agentRegistry.getAgent(agentId);
          const agentName = agent?.getMetadata().name || agentId;
          
          emitMessage({
            id: `status_${Date.now()}`,
            role: 'assistant',
            content: `🎯 Selected agent: ${agentName} for task delegation`,
            timestamp: new Date()
          });
        }

        const result = await this.mcpTool.execute(toolCall, context);
        results.push(result);

        // Emit task completion status
        if (emitMessage) {
          const status = result.status === 'completed' ? '✅' : '❌';
          emitMessage({
            id: `status_${Date.now()}`,
            role: 'assistant',
            content: `${status} Task completed by agent: ${result.delegatedTo.join(', ')}`,
            timestamp: new Date()
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate final response incorporating delegation results
   */
  private async generateFinalResponse(
    originalMessage: string,
    aiResponse: string,
    delegationResults: MCPToolResult[],
    context: AgentContext
  ): Promise<string> {
    if (delegationResults.length === 0) {
      return aiResponse;
    }

    const prompt = `
Original user message: "${originalMessage}"

Initial AI response: "${aiResponse}"

Agent delegation results:
${delegationResults.map((result, index) => `
Task ${index + 1}:
- Task ID: ${result.taskId}
- Delegated to: ${result.delegatedTo.join(', ')}
- Status: ${result.status}
- Summary: ${result.summary || 'No summary provided'}
`).join('\n')}

Please provide a comprehensive response that:
1. Addresses the original user request
2. Incorporates and explains the results from agent delegations
3. Provides actionable insights or recommendations based on the agent results
4. Maintains a conversational tone

Focus on being helpful and providing value to the user.`;

    try {
      const response = await this.provider!.sendMessage([
        {
          id: `sys_${Date.now()}`,
          role: 'system',
          content: 'You are a helpful AI coordinator that synthesizes results from multiple specialized agents into clear, actionable responses.',
          timestamp: new Date()
        },
        {
          id: `user_${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: new Date()
        }
      ], {
        maxTokens: 1000,
        temperature: 0.3
      });

      return response.message.content;
    } catch (error) {
      // Fallback to simple response if AI summary fails
      return `${aiResponse}\n\nAgent Results:\n${delegationResults.map(r => 
        `- ${r.delegatedTo.join(', ')}: ${r.summary || 'Task completed'}`
      ).join('\n')}`;
    }
  }

  /**
   * Get coordinator status
   */
  getStatus(): {
    agentCount: number;
    availableTaskTypes: string[];
    isInitialized: boolean;
  } {
    return {
      agentCount: this.agentRegistry.getAgentCount(),
      availableTaskTypes: this.mcpTool.getAvailableTaskTypes(),
      isInitialized: this.provider !== null
    };
  }
} 