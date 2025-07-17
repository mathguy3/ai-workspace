import { BaseAgent } from './BaseAgent.js';
import { 
  AgentMetadata, 
  AgentTool, 
  AgentTask, 
  AgentTaskResult, 
  AgentContext 
} from '../types/agent.js';

/**
 * Code Analysis Agent
 * Specialized agent for analyzing code quality, security, and performance
 */
export class CodeAnalysisAgent extends BaseAgent {
  constructor() {
    const metadata: AgentMetadata = {
      id: 'code-analysis-agent',
      name: 'Code Analysis Agent',
      description: 'Analyzes code for quality, security vulnerabilities, performance issues, and best practices',
      version: '1.0.0',
      capabilities: [
        'code_quality_analysis',
        'security_vulnerability_detection',
        'performance_analysis',
        'best_practices_review',
        'complexity_analysis'
      ],
      supportedTaskTypes: [
        'code_analysis',
        'security_audit',
        'performance_review',
        'code_review'
      ],
      tags: ['code', 'analysis', 'security', 'performance', 'quality'],
      author: 'Coordinator Team',
      homepage: 'https://github.com/coordinator/ai-manager'
    };

    const tools: AgentTool[] = [
      {
        name: 'analyze_code_quality',
        description: 'Analyze code for quality issues including complexity, maintainability, and readability',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to analyze'
            },
            language: {
              type: 'string',
              description: 'Programming language of the code'
            },
            analysisType: {
              type: 'string',
              enum: ['complexity', 'maintainability', 'readability', 'all'],
              description: 'Type of analysis to perform'
            }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'detect_security_vulnerabilities',
        description: 'Detect potential security vulnerabilities in code',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to analyze for security issues'
            },
            language: {
              type: 'string',
              description: 'Programming language of the code'
            },
            vulnerabilityTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['sql_injection', 'xss', 'buffer_overflow', 'authentication', 'authorization', 'all']
              },
              description: 'Types of vulnerabilities to check for'
            }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'analyze_performance',
        description: 'Analyze code for performance issues and optimization opportunities',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to analyze for performance issues'
            },
            language: {
              type: 'string',
              description: 'Programming language of the code'
            },
            focusAreas: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['algorithm_complexity', 'memory_usage', 'cpu_usage', 'io_operations', 'all']
              },
              description: 'Performance areas to focus on'
            }
          },
          required: ['code', 'language']
        }
      }
    ];

    super(metadata, tools);
  }

  /**
   * Execute a code analysis task
   */
  async executeTask(task: AgentTask, context: AgentContext): Promise<AgentTaskResult> {
    const startTime = Date.now();
    
    try {
      this.status = 'working';

      const { code, language, analysisType = 'all' } = task.parameters as {
        code: string;
        language: string;
        analysisType?: string;
      };

      if (!code || !language) {
        throw new Error('Code and language are required parameters');
      }

      // Determine which analysis to perform based on task type and parameters
      let analysisResults: Record<string, unknown> = {};

      if (task.type === 'code_analysis' || task.type === 'code_review') {
        analysisResults = await this.performCodeQualityAnalysis(code, language, analysisType);
      } else if (task.type === 'security_audit') {
        analysisResults = await this.performSecurityAnalysis(code, language);
      } else if (task.type === 'performance_review') {
        analysisResults = await this.performPerformanceAnalysis(code, language);
      } else {
        // Perform comprehensive analysis
        const [qualityResults, securityResults, performanceResults] = await Promise.all([
          this.performCodeQualityAnalysis(code, language, 'all'),
          this.performSecurityAnalysis(code, language),
          this.performPerformanceAnalysis(code, language)
        ]);

        analysisResults = {
          quality: qualityResults,
          security: securityResults,
          performance: performanceResults
        };
      }

      const executionTime = Date.now() - startTime;
      this.status = 'idle';

      return this.createTaskResult(
        task.id,
        true,
        analysisResults,
        executionTime,
        undefined,
        undefined,
        undefined,
        {
          language,
          analysisType,
          codeLength: code.length
        }
      );

    } catch (error) {
      this.status = 'error';
      const executionTime = Date.now() - startTime;
      
      return this.createTaskResult(
        task.id,
        false,
        null,
        executionTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Perform code quality analysis
   */
  private async performCodeQualityAnalysis(
    code: string, 
    language: string, 
    analysisType: string
  ): Promise<Record<string, unknown>> {
    const prompt = `
Analyze the following ${language} code for quality issues. Focus on: ${analysisType}.

Code:
\`\`\`${language}
${code}
\`\`\`

Please provide a comprehensive analysis including:
1. Code complexity assessment
2. Maintainability score
3. Readability analysis
4. Potential improvements
5. Best practices compliance

Format your response as JSON with the following structure:
{
  "complexity": {
    "score": "low|medium|high",
    "details": "explanation",
    "metrics": {}
  },
  "maintainability": {
    "score": "low|medium|high",
    "details": "explanation",
    "issues": []
  },
  "readability": {
    "score": "low|medium|high",
    "details": "explanation",
    "suggestions": []
  },
  "overall_score": "low|medium|high",
  "recommendations": []
}
`;

    const response = await this.sendToAI([
      {
        role: 'system',
        content: 'You are a code quality analyst. Provide detailed, actionable analysis in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      maxTokens: 1000,
      temperature: 0.2
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return { rawAnalysis: response.content };
    }
  }

  /**
   * Perform security analysis
   */
  private async performSecurityAnalysis(
    code: string, 
    language: string
  ): Promise<Record<string, unknown>> {
    const prompt = `
Analyze the following ${language} code for security vulnerabilities.

Code:
\`\`\`${language}
${code}
\`\`\`

Please identify potential security issues including:
1. SQL injection vulnerabilities
2. Cross-site scripting (XSS) risks
3. Authentication/authorization issues
4. Input validation problems
5. Secure coding violations

Format your response as JSON with the following structure:
{
  "vulnerabilities": [
    {
      "type": "vulnerability_type",
      "severity": "low|medium|high|critical",
      "description": "description",
      "line": "line_number_or_location",
      "recommendation": "how_to_fix"
    }
  ],
  "overall_security_score": "low|medium|high",
  "risk_level": "low|medium|high|critical",
  "recommendations": []
}
`;

    const response = await this.sendToAI([
      {
        role: 'system',
        content: 'You are a security analyst. Identify security vulnerabilities and provide remediation advice in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      maxTokens: 1000,
      temperature: 0.1
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return { rawSecurityAnalysis: response.content };
    }
  }

  /**
   * Perform performance analysis
   */
  private async performPerformanceAnalysis(
    code: string, 
    language: string
  ): Promise<Record<string, unknown>> {
    const prompt = `
Analyze the following ${language} code for performance issues and optimization opportunities.

Code:
\`\`\`${language}
${code}
\`\`\`

Please identify performance concerns including:
1. Algorithm complexity issues
2. Memory usage problems
3. CPU utilization concerns
4. I/O operation inefficiencies
5. Optimization opportunities

Format your response as JSON with the following structure:
{
  "performance_issues": [
    {
      "type": "issue_type",
      "severity": "low|medium|high",
      "description": "description",
      "impact": "performance_impact",
      "optimization": "suggested_improvement"
    }
  ],
  "complexity_analysis": {
    "time_complexity": "O(n) notation",
    "space_complexity": "O(n) notation",
    "bottlenecks": []
  },
  "optimization_score": "low|medium|high",
  "recommendations": []
}
`;

    const response = await this.sendToAI([
      {
        role: 'system',
        content: 'You are a performance analyst. Identify performance issues and suggest optimizations in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      maxTokens: 1000,
      temperature: 0.2
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return { rawPerformanceAnalysis: response.content };
    }
  }
} 