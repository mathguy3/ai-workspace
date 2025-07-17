import { 
  Agent, 
  AgentRegistry as IAgentRegistry, 
  AgentTask, 
  AgentMetadata 
} from '../types/agent.js';

/**
 * Agent Registry
 * Manages registration, discovery, and retrieval of agents
 */
export class AgentRegistry implements IAgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    const metadata = agent.getMetadata();
    this.agents.set(metadata.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(agentId: string): Agent | null {
    return this.agents.get(agentId) ?? null;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents that can handle a specific task
   */
  findAgentsForTask(task: AgentTask): Agent[] {
    return this.getAllAgents().filter(agent => agent.canHandleTask(task));
  }

  /**
   * Get metadata for all agents
   */
  getAgentMetadata(): AgentMetadata[] {
    return this.getAllAgents().map(agent => agent.getMetadata());
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): Agent[] {
    return this.getAllAgents().filter(agent => 
      agent.getMetadata().capabilities.includes(capability)
    );
  }

  /**
   * Get agents by tag
   */
  getAgentsByTag(tag: string): Agent[] {
    return this.getAllAgents().filter(agent => 
      agent.getMetadata().tags.includes(tag)
    );
  }

  /**
   * Get agents by task type
   */
  getAgentsByTaskType(taskType: string): Agent[] {
    return this.getAllAgents().filter(agent => 
      agent.getMetadata().supportedTaskTypes.includes(taskType)
    );
  }

  /**
   * Get healthy agents only
   */
  async getHealthyAgents(): Promise<Agent[]> {
    const agents = this.getAllAgents();
    const healthyAgents: Agent[] = [];

    for (const agent of agents) {
      try {
        const health = await agent.getHealth();
        if (health.status === 'healthy') {
          healthyAgents.push(agent);
        }
      } catch (error) {
        console.warn(`Health check failed for agent ${agent.getMetadata().id}:`, error);
      }
    }

    return healthyAgents;
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }
} 