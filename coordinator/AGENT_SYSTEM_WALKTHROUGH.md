# Agent System Walkthrough

## Overview

The agent system is designed around **opaque, specialized agents** that each handle specific types of tasks. The coordinator uses an MCP (Model Context Protocol) tool to intelligently delegate tasks to appropriate agents, then summarizes their results.

## Architecture Components

### 1. **Agent Interface & Base Classes**
- `Agent` interface defines the contract for all agents
- `BaseAgent` provides common functionality (AI provider integration, status management, etc.)
- Each agent implements specific task types and capabilities

### 2. **Agent Registry & Discovery**
- `AgentRegistry` manages registration and discovery of agents
- Provides methods to find agents by task type, capability, or tag
- Handles health checks and agent lifecycle

### 3. **MCP Tool for Task Delegation**
- `MCPDelegationTool` allows the coordinator to delegate tasks via function calls
- Integrates with OpenRouter's tool calling system
- Provides intelligent agent selection based on task requirements

### 4. **Task Management**
- `TaskManager` handles task execution, timeout management, and result aggregation
- Generates AI-powered summaries of agent results
- Tracks execution statistics and costs

### 5. **Agent Coordinator**
- `AgentCoordinator` integrates everything with the main AI Manager
- Processes user messages and determines when to delegate to agents
- Synthesizes results into coherent responses

## Complete User Request Flow Example

Let's walk through a complete example of how a user request flows through the system:

### User Request
```
"Can you analyze this JavaScript code for security vulnerabilities and performance issues?

function processUserInput(input) {
  const query = 'SELECT * FROM users WHERE id = ' + input;
  return database.execute(query);
}"
```

### Step 1: Request Processing
1. **User sends message** to the `AgentCoordinator`
2. **Status Update**: "🤔 Analyzing your request and determining if specialized agents are needed..."
3. **System prompt is generated** with available agents (automatically registered during initialization):
   ```
   You are an AI coordinator that can delegate tasks to specialized agents.
   
   Available Agents:
   - Code Analysis Agent (code-analysis-agent): Analyzes code for quality, security vulnerabilities, performance issues, and best practices - Supports: code_analysis, security_audit, performance_review, code_review
   
   When a user request requires specialized analysis or processing, you can use the delegate_task tool to hand off work to appropriate agents.
   ```

4. **Status Update**: "🧠 Consulting with AI coordinator to determine the best approach..."
5. **AI analyzes the request** and determines it requires specialized code analysis

### Step 2: Task Delegation
6. **Status Update**: "🔄 Delegating task to specialized agent..."
7. **AI calls the MCP tool** with task details:
   ```json
   {
     "name": "delegate_task",
     "arguments": {
       "agentId": "code-analysis-agent",
       "taskType": "code_analysis",
       "description": "Analyze JavaScript code for security vulnerabilities and performance issues",
       "parameters": {
         "code": "function processUserInput(input) { const query = 'SELECT * FROM users WHERE id = ' + input; return database.execute(query); }",
         "language": "javascript",
         "analysisType": "all"
       },
       "priority": "medium",
       "timeout": 30000
     }
   }
   ```

### Step 3: Agent Execution
8. **Status Update**: "🎯 Selected agent: Code Analysis Agent for task delegation"
9. **MCPDelegationTool creates a task**:
   ```typescript
   const task: AgentTask = {
     id: "task_1703123456789_abc123",
     type: "code_analysis",
     description: "Analyze JavaScript code for security vulnerabilities and performance issues",
     parameters: { code: "...", language: "javascript", analysisType: "all" },
     priority: "medium",
     timeout: 30000
   };
   ```

10. **AgentRegistry finds the requested agent**:
    - Looks up the specific agent ID: `code-analysis-agent`
    - Retrieves the `CodeAnalysisAgent` instance

11. **TaskManager delegates to the selected agent**:
    - Creates execution context
    - Runs the single agent with timeout protection
    - Collects the result from the agent

12. **Status Update**: "✅ Task completed by agent: code-analysis-agent"

### Step 4: Agent Processing
8. **CodeAnalysisAgent executes the task**:
   - Receives the task and context
   - Performs comprehensive analysis:
     - **Code Quality Analysis**: Complexity, maintainability, readability
     - **Security Analysis**: SQL injection vulnerabilities, input validation
     - **Performance Analysis**: Algorithm complexity, optimization opportunities
   - Uses OpenRouterProvider to send analysis requests to AI
   - Returns structured results

9. **Example agent results**:
   ```json
   {
     "quality": {
       "complexity": { "score": "medium", "details": "Simple function with potential security issues" },
       "maintainability": { "score": "low", "details": "Hardcoded SQL query, no input validation" },
       "readability": { "score": "high", "details": "Clear function structure" },
       "overall_score": "medium"
     },
     "security": {
       "vulnerabilities": [
         {
           "type": "sql_injection",
           "severity": "critical",
           "description": "Direct string concatenation in SQL query",
           "line": "2",
           "recommendation": "Use parameterized queries"
         }
       ],
       "overall_security_score": "low",
       "risk_level": "critical"
     },
     "performance": {
       "performance_issues": [
         {
           "type": "database_query",
           "severity": "medium",
           "description": "No query optimization or indexing consideration",
           "optimization": "Add proper indexing and query optimization"
         }
       ],
       "optimization_score": "medium"
     }
   }
   ```

### Step 5: Result Aggregation
13. **Status Update**: "📝 Summarizing agent results and preparing final response..."
14. **TaskManager processes the result**:
    - Collects the result from the single agent
    - Calculates execution statistics
    - Generates AI-powered summary

15. **AI summary generation**:
    ```typescript
    const summaryPrompt = `
    Task: Analyze JavaScript code for security vulnerabilities and performance issues
    Task Type: code_analysis
    
    Results Summary:
    1 successful execution, 0 failed executions
    
    Successful Results:
    - code-analysis-agent: {"quality": {...}, "security": {...}, "performance": {...}}
    
    Please provide a concise summary of the overall results and any key findings or recommendations.
    `;
    ```

### Step 6: Final Response Generation
16. **AgentCoordinator generates final response**:
    ```typescript
    const finalPrompt = `
    Original user message: "Can you analyze this JavaScript code for security vulnerabilities and performance issues?"
    
    Initial AI response: "I'll analyze this code for you."
    
    Agent delegation results:
    Task 1:
    - Task ID: task_1703123456789_abc123
    - Delegated to: code-analysis-agent
    - Status: completed
    - Summary: Critical SQL injection vulnerability detected. Code has medium complexity and performance optimization opportunities.
    
    Please provide a comprehensive response that addresses the original user request and incorporates the agent results.
    `;
    ```

17. **Final user response**:
    ```
    I've analyzed your JavaScript code and found several important issues that need attention:

    🔴 **Critical Security Vulnerability**: 
    Your code has a severe SQL injection vulnerability. The direct string concatenation in the SQL query allows malicious input to execute arbitrary database commands. This is a critical security risk.

    **Recommendation**: Replace the current query with parameterized queries:
    ```javascript
    function processUserInput(input) {
      const query = 'SELECT * FROM users WHERE id = ?';
      return database.execute(query, [input]);
    }
    ```

    📊 **Code Quality Assessment**:
    - Complexity: Medium (simple function structure)
    - Maintainability: Low (hardcoded SQL, no input validation)
    - Readability: High (clear function structure)

    ⚡ **Performance Considerations**:
    - The database query lacks optimization considerations
    - Consider adding proper indexing for the 'id' column
    - Monitor query performance in production

    **Priority Actions**:
    1. Fix the SQL injection vulnerability immediately (critical)
    2. Add input validation and sanitization
    3. Implement proper error handling
    4. Consider adding database query optimization

    The code structure is clear and readable, but the security and maintainability issues need immediate attention.
    ```

## Key Benefits of This Architecture

### 1. **Opaque Agent Design**
- Agents are self-contained and don't expose internal implementation details
- Each agent focuses on specific capabilities
- Easy to add new agents without modifying existing code

### 2. **Intelligent Task Delegation**
- AI coordinator determines when and how to delegate tasks
- Explicit agent selection by the AI based on task requirements
- Clear agent capabilities and task type matching
- Graceful fallback when no suitable agents are available

### 3. **Comprehensive Result Synthesis**
- AI-powered summarization of agent results
- Context-aware response generation
- Maintains conversational flow while incorporating technical analysis

### 4. **Real-time Status Updates**
- Live visibility into the coordination process
- Status messages for each step of agent delegation
- User-friendly progress indicators with emojis
- Event-driven updates for real-time applications

### 5. **Scalable Architecture**
- Easy to add new agent types
- Single-agent task execution for focused results
- Robust error handling and timeout management

### 6. **Cost and Performance Tracking**
- Token usage tracking per agent
- Execution time monitoring
- Cost calculation and optimization

## Extending the System

### Automatic Agent Registration
The `AgentCoordinator` automatically registers built-in agents during initialization:

```typescript
// Built-in agents are automatically registered
const agentCoordinator = new AgentCoordinator(aiSettings);
await agentCoordinator.initialize(aiSettings);

// The CodeAnalysisAgent is now available without manual registration
console.log('Available agents:', agentCoordinator.getAgentMetadata().map(a => a.name));
// Output: ['Code Analysis Agent']
```

To add new built-in agents, update the `registerBuiltInAgents()` method in `AgentCoordinator`:

```typescript
private async registerBuiltInAgents(): Promise<void> {
  // Register Code Analysis Agent
  const codeAnalysisAgent = new CodeAnalysisAgent();
  await codeAnalysisAgent.initialize({ aiSettings: this.settings! });
  this.registerAgent(codeAnalysisAgent);
  
  // Add new built-in agents here
  const dataAnalysisAgent = new DataAnalysisAgent();
  await dataAnalysisAgent.initialize({ aiSettings: this.settings! });
  this.registerAgent(dataAnalysisAgent);
}
```

### Adding Custom Agents
For custom agents that aren't built-in:

1. Extend `BaseAgent` class
2. Implement required methods (`executeTask`, `getMetadata`, etc.)
3. Define supported task types and capabilities
4. Register manually with `AgentCoordinator`:

```typescript
const customAgent = new CustomAgent();
await customAgent.initialize({ aiSettings });
agentCoordinator.registerAgent(customAgent);
```

### Adding New Task Types
1. Define task type in agent metadata
2. Update MCP tool descriptions
3. Implement task handling logic in agents

### Customizing Delegation Logic
1. Modify `MCPDelegationTool` for custom agent selection
2. Update system prompts for different use cases
3. Customize result aggregation and summarization

This architecture provides a flexible, scalable foundation for building sophisticated AI agent systems that can handle complex, multi-faceted tasks while maintaining a simple, intuitive user experience. 