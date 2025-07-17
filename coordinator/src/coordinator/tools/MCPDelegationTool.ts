import { 
  AgentTask, 
  AgentContext, 
  MCPToolCall, 
  MCPToolResult,
  TaskDelegationResult 
} from '../types/agent.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { TaskManager } from './TaskManager.js';

/**
 * MCP Tool for Task Delegation
 * Allows the coordinator to intelligently delegate tasks to appropriate agents
 */
export class MCPDelegationTool {
  private agentRegistry: AgentRegistry;
  private taskManager: TaskManager;

  constructor(agentRegistry: AgentRegistry, taskManager: TaskManager) {
    this.agentRegistry = agentRegistry;
    this.taskManager = taskManager;
  }

  /**
   * Get tool definition for MCP
   */
  getToolDefinition() {
    const availableAgents = this.agentRegistry.getAgentMetadata();
    const agentOptions = availableAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      supportedTasks: agent.supportedTaskTypes
    }));

    return {
      type: 'function' as const,
      function: {
        name: 'delegate_task',
        description: 'Delegate a task to a specific agent. Available agents and their capabilities are provided in the parameters.',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent to delegate the task to. Must be from the available agents list.',
              enum: availableAgents.map(a => a.id)
            },
            taskType: {
              type: 'string',
              description: 'The type of task to delegate (e.g., "code_analysis", "data_processing", "research")'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the task to be performed'
            },
            parameters: {
              type: 'object',
              description: 'Additional parameters for the task',
              additionalProperties: true
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority level',
              default: 'medium'
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds',
              default: 30000
            }
          },
          required: ['agentId', 'taskType', 'description']
        }
      }
    };
  }

  /**
   * Execute the delegation tool
   */
  async execute(call: MCPToolCall, context: AgentContext): Promise<MCPToolResult> {
    try {
      // Create task from MCP call
      const task: AgentTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: call.arguments.taskType,
        description: call.arguments.description,
        parameters: call.arguments.parameters ?? {},
        priority: call.arguments.priority ?? 'medium',
        timeout: call.arguments.timeout ?? 30000,
        metadata: {
          source: 'mcp_delegation',
          context: context
        }
      };

      // Get the specific agent requested by the AI
      const requestedAgentId = call.arguments.agentId;
      const selectedAgent = this.agentRegistry.getAgent(requestedAgentId);
      
      if (!selectedAgent) {
        return {
          taskId: task.id,
          delegatedTo: [],
          status: 'failed',
          summary: `Agent ${requestedAgentId} not found in registry`
        };
      }

      // Delegate task to the selected agent
      const delegationResult = await this.taskManager.delegateTask(task, [selectedAgent], context);

      return {
        taskId: task.id,
        delegatedTo: delegationResult.delegatedTo,
        status: delegationResult.results.some(r => r.success) ? 'completed' : 'failed',
        results: delegationResult.results,
        summary: delegationResult.summary
      };

    } catch (error) {
      return {
        taskId: `task_${Date.now()}`,
        delegatedTo: [],
        status: 'failed',
        summary: `Delegation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get available task types from registered agents
   */
  getAvailableTaskTypes(): string[] {
    const agents = this.agentRegistry.getAllAgents();
    const taskTypes = new Set<string>();
    
    agents.forEach(agent => {
      agent.getMetadata().supportedTaskTypes.forEach(taskType => {
        taskTypes.add(taskType);
      });
    });
    
    return Array.from(taskTypes);
  }

  /**
   * Get agent capabilities for task type
   */
  getAgentCapabilitiesForTaskType(taskType: string): Array<{
    agentId: string;
    agentName: string;
    capabilities: string[];
    tags: string[];
  }> {
    const agents = this.agentRegistry.getAgentsByTaskType(taskType);
    
    return agents.map(agent => {
      const metadata = agent.getMetadata();
      return {
        agentId: metadata.id,
        agentName: metadata.name,
        capabilities: metadata.capabilities,
        tags: metadata.tags
      };
    });
  }
} 