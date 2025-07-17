// Agent System Types and Interfaces

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  supportedTaskTypes: string[];
  tags: string[];
  author?: string;
  homepage?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
}

export interface AgentTask {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentTaskResult {
  taskId: string;
  agentId: string;
  success: boolean;
  result: unknown;
  error?: string;
  executionTime: number;
  tokensUsed?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  taskId: string;
  conversationId?: string;
  userContext?: Record<string, unknown>;
  coordinatorSettings?: Record<string, unknown>;
}

// Main Agent Interface
export interface Agent {
  // Metadata and discovery
  getMetadata(): AgentMetadata;
  getTools(): AgentTool[];
  
  // Task execution
  canHandleTask(task: AgentTask): boolean;
  executeTask(task: AgentTask, context: AgentContext): Promise<AgentTaskResult>;
  
  // Lifecycle
  initialize?(settings?: Record<string, unknown>): Promise<void>;
  destroy?(): Promise<void>;
  
  // Health and status
  getStatus(): 'idle' | 'working' | 'error';
  getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: string;
    lastCheck: Date;
  }>;
}

// Agent Registry Interface
export interface AgentRegistry {
  registerAgent(agent: Agent): void;
  unregisterAgent(agentId: string): void;
  getAgent(agentId: string): Agent | null;
  getAllAgents(): Agent[];
  findAgentsForTask(task: AgentTask): Agent[];
  getAgentMetadata(): AgentMetadata[];
}

// Coordinator Task Management
export interface TaskDelegationResult {
  taskId: string;
  delegatedTo: string[];
  results: AgentTaskResult[];
  summary: string;
  totalExecutionTime: number;
  totalTokensUsed: number;
  totalCost: number;
}

// MCP Tool for Task Delegation
export interface MCPToolCall {
  name: 'delegate_task';
  arguments: {
    agentId: string;
    taskType: string;
    description: string;
    parameters?: Record<string, unknown>;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    timeout?: number;
  };
}

export interface MCPToolResult {
  taskId: string;
  delegatedTo: string[];
  status: 'delegated' | 'completed' | 'failed';
  results?: AgentTaskResult[];
  summary?: string;
} 