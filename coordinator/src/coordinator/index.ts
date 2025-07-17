// Main entry point for the AI Manager library
export { AIManager } from './core/AIManager.js';

// Agent System Components
export { AgentCoordinator } from './core/AgentCoordinator.js';
export { BaseAgent } from './agents/BaseAgent.js';
export { AgentRegistry } from './agents/AgentRegistry.js';
export { CodeAnalysisAgent } from './agents/CodeAnalysisAgent.js';
export { MCPDelegationTool } from './tools/MCPDelegationTool.js';
export { TaskManager } from './tools/TaskManager.js';

// Export all types
export type {
  AIManagerStatus,
  AIMessage,
  AIModel,
  AISettings,
  SendMessageOptions,
  SendMessageResult,
  AIManagerEvents,
  Conversation,
  ToolCall,
  ToolResult
} from './types/index.js';

// Export agent types
export type {
  Agent,
  AgentMetadata,
  AgentTool,
  AgentTask,
  AgentTaskResult,
  AgentContext,
  TaskDelegationResult,
  MCPToolCall,
  MCPToolResult
} from './types/agent.js';

// Export error classes
export {
  AIManagerError,
  AuthenticationError,
  ModelNotFoundError,
  RateLimitError,
  ConnectionError,
  ToolExecutionError
} from './types/index.js';

// Export the interface for type checking
export type { AIManager as IAIManager } from './types/index.js'; 