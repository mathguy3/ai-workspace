import { 
  Agent, 
  AgentTask, 
  AgentTaskResult, 
  AgentContext, 
  TaskDelegationResult 
} from '../types/agent.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { AISettings } from '../types/index.js';

/**
 * Task Manager
 * Handles task delegation, execution, and result aggregation
 */
export class TaskManager {
  private provider: OpenRouterProvider | null = null;

  constructor(aiSettings?: AISettings) {
    if (aiSettings) {
      this.provider = new OpenRouterProvider(aiSettings);
    }
  }

  /**
   * Delegate a task to multiple agents and aggregate results
   */
  async delegateTask(
    task: AgentTask, 
    agents: Agent[], 
    context: AgentContext
  ): Promise<TaskDelegationResult> {
    const startTime = Date.now();
    const results: AgentTaskResult[] = [];
    const delegatedTo: string[] = [];

    // Execute tasks in parallel
    const executionPromises = agents.map(async (agent) => {
      try {
        delegatedTo.push(agent.getMetadata().id);
        const result = await this.executeTaskWithTimeout(agent, task, context);
        results.push(result);
        return result;
      } catch (error) {
        const errorResult: AgentTaskResult = {
          taskId: task.id,
          agentId: agent.getMetadata().id,
          success: false,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
          metadata: { error: true }
        };
        results.push(errorResult);
        return errorResult;
      }
    });

    // Wait for all executions to complete
    await Promise.allSettled(executionPromises);

    const totalExecutionTime = Date.now() - startTime;
    const totalTokensUsed = results.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);

    // Generate summary using AI if provider is available
    const summary = await this.generateSummary(task, results, context);

    return {
      taskId: task.id,
      delegatedTo,
      results,
      summary,
      totalExecutionTime,
      totalTokensUsed,
      totalCost
    };
  }

  /**
   * Execute a task with timeout
   */
  private async executeTaskWithTimeout(
    agent: Agent, 
    task: AgentTask, 
    context: AgentContext
  ): Promise<AgentTaskResult> {
    const timeout = task.timeout ?? 30000;
    
    return Promise.race([
      agent.executeTask(task, context),
      new Promise<AgentTaskResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task execution timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Generate a summary of task results using AI
   */
  private async generateSummary(
    task: AgentTask, 
    results: AgentTaskResult[], 
    context: AgentContext
  ): Promise<string> {
    if (!this.provider) {
      // Fallback to simple summary if no AI provider
      return this.generateSimpleSummary(task, results);
    }

    try {
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      const summaryPrompt = `
Task: ${task.description}
Task Type: ${task.type}

Results Summary:
${successfulResults.length} successful executions, ${failedResults.length} failed executions

Successful Results:
${successfulResults.map(r => `- ${r.agentId}: ${JSON.stringify(r.result)}`).join('\n')}

${failedResults.length > 0 ? `Failed Results:\n${failedResults.map(r => `- ${r.agentId}: ${r.error}`).join('\n')}` : ''}

Please provide a concise summary of the overall results and any key findings or recommendations.
`;

      const response = await this.provider.sendMessage([
        {
          id: `sys_${Date.now()}`,
          role: 'system',
          content: 'You are a task coordinator that summarizes results from multiple agent executions. Provide clear, concise summaries focusing on key findings and actionable insights.',
          timestamp: new Date()
        },
        {
          id: `user_${Date.now()}`,
          role: 'user',
          content: summaryPrompt,
          timestamp: new Date()
        }
      ], {
        maxTokens: 500,
        temperature: 0.3
      });

      return response.message.content;
    } catch (error) {
      console.warn('Failed to generate AI summary, falling back to simple summary:', error);
      return this.generateSimpleSummary(task, results);
    }
  }

  /**
   * Generate a simple summary without AI
   */
  private generateSimpleSummary(task: AgentTask, results: AgentTaskResult[]): string {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    let summary = `Task "${task.type}" completed with ${successfulResults.length} successful and ${failedResults.length} failed executions.\n\n`;
    
    if (successfulResults.length > 0) {
      summary += `Successful agents: ${successfulResults.map(r => r.agentId).join(', ')}\n`;
    }
    
    if (failedResults.length > 0) {
      summary += `Failed agents: ${failedResults.map(r => r.agentId).join(', ')}\n`;
    }
    
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    summary += `\nAverage execution time: ${avgExecutionTime.toFixed(2)}ms`;
    
    return summary;
  }

  /**
   * Update AI settings
   */
  updateAISettings(settings: AISettings): void {
    this.provider = new OpenRouterProvider(settings);
  }

  /**
   * Get task execution statistics
   */
  getTaskStats(results: AgentTaskResult[]): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    totalTokensUsed: number;
    totalCost: number;
  } {
    const totalTasks = results.length;
    const successfulTasks = results.filter(r => r.success).length;
    const failedTasks = totalTasks - successfulTasks;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTasks;
    const totalTokensUsed = results.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      averageExecutionTime,
      totalTokensUsed,
      totalCost
    };
  }
} 