import { 
  AIModel, 
  AISettings, 
  AIMessage, 
  SendMessageOptions, 
  SendMessageResult,
  AuthenticationError,
  RateLimitError,
  ConnectionError,
  ModelNotFoundError
} from '../types/index.js';

/**
 * OpenRouter API response types
 */
interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: 'auto' | 'none' | {
    type: 'function';
    function: {
      name: string;
    };
  };
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterModelsResponse {
  data: Array<{
    id: string;
    name: string;
    context_length: number;
    pricing: {
      prompt: string;
      completion: string;
    };
    supported_parameters: string[];
  }>;
}

/**
 * OpenRouter API Provider
 * Handles all communication with the OpenRouter API
 */
export class OpenRouterProvider {
  private settings: AISettings;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private modelsCache: AIModel[] = [];
  private lastModelsFetch: number = 0;
  private readonly MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(settings: AISettings) {
    this.settings = settings;
    this.baseUrl = settings.baseUrl ?? 'https://openrouter.ai/api/v1';
    this.timeout = settings.timeout ?? 30000;
    this.retryAttempts = settings.retryAttempts ?? 3;
  }

  /**
   * Update provider settings
   */
  updateSettings(settings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.baseUrl = this.settings.baseUrl ?? 'https://openrouter.ai/api/v1';
    this.timeout = this.settings.timeout ?? 30000;
    this.retryAttempts = this.settings.retryAttempts ?? 3;
  }

  /**
   * Get current settings
   */
  getSettings(): AISettings {
    return { ...this.settings };
  }

  /**
   * Test connection to OpenRouter
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchModels();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<AIModel[]> {
    const now = Date.now();
    
    // Return cached models if still valid
    if (this.modelsCache.length > 0 && 
        now - this.lastModelsFetch < this.MODELS_CACHE_DURATION) {
      return [...this.modelsCache];
    }

    try {
      const models = await this.fetchModels();
      this.modelsCache = models;
      this.lastModelsFetch = now;
      return models;
    } catch (error) {
      // Return cached models if available, even if expired
      if (this.modelsCache.length > 0) {
        console.warn('Using cached models due to fetch error:', error);
        return [...this.modelsCache];
      }
      throw error;
    }
  }

  /**
   * Get a specific model by ID
   */
  async getModelById(id: string): Promise<AIModel | null> {
    const models = await this.getAvailableModels();
    return models.find(model => model.id === id) ?? null;
  }

  /**
   * Send a message to OpenRouter
   */
  async sendMessage(
    messages: AIMessage[], 
    options: SendMessageOptions = {}
  ): Promise<SendMessageResult> {
    const model = options.model ?? this.settings.defaultModel;
    
    // Validate model exists
    const modelInfo = await this.getModelById(model);
    if (!modelInfo) {
      throw new ModelNotFoundError(model);
    }

    const requestBody: OpenRouterRequest = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: options.stream ?? false,
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(this.settings.maxTokens !== undefined && { max_tokens: this.settings.maxTokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(this.settings.temperature !== undefined && { temperature: this.settings.temperature }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(this.settings.topP !== undefined && { top_p: this.settings.topP }),
      ...(options.tools && { tools: options.tools }),
      ...(options.tool_choice && { tool_choice: options.tool_choice })
    };

    try {
      const requestBodyString = JSON.stringify(requestBody, null, 2);
      console.log('OpenRouter request body:', requestBodyString.substring(0, 1000) + '...');
      
      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: requestBodyString
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      let data: OpenRouterResponse;
      try {
        const responseText = await response.text();
        console.log('OpenRouter response:', responseText.substring(0, 500) + '...');
        data = JSON.parse(responseText) as OpenRouterResponse;
      } catch (parseError) {
        console.error('Failed to parse OpenRouter response:', parseError);
        throw new ConnectionError(`Failed to parse OpenRouter response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      const choice = data.choices[0];
      
      if (!choice) {
        throw new Error('No response from OpenRouter');
      }

      // Safely parse tool calls with error handling
      let toolCalls: Array<{id: string; name: string; arguments: Record<string, unknown>}> = [];
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        try {
          toolCalls = choice.message.tool_calls.map(tc => {
            try {
              const parsedArgs = JSON.parse(tc.function.arguments);
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: parsedArgs
              };
            } catch (parseError) {
              console.error('Failed to parse tool call arguments:', tc.function.arguments);
              console.error('Parse error:', parseError);
              // Return a safe fallback
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: { error: 'Failed to parse arguments' }
              };
            }
          });
        } catch (error) {
          console.error('Error processing tool calls:', error);
          toolCalls = [];
        }
      }

      const assistantMessage: AIMessage = {
        id: data.id,
        content: choice.message.content ?? '',
        role: 'assistant',
        timestamp: new Date(),
        model: model,
        metadata: {
          toolCalls,
          finishReason: choice.finish_reason
        }
      };

      return {
        message: assistantMessage,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        }
      };

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw new ConnectionError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async fetchModels(): Promise<AIModel[]> {
    const response = await this.makeRequest('/models', {
      headers: {
        'Authorization': `Bearer ${this.settings.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json() as OpenRouterModelsResponse;
    
    return data.data.map(model => ({
      id: model.id,
      name: model.name,
      provider: this.extractProvider(model.id),
      contextLength: model.context_length,
      pricing: {
        input: this.parsePricing(model.pricing.prompt),
        output: this.parsePricing(model.pricing.completion)
      },
      capabilities: model.supported_parameters,
      supportsTools: this.supportsTools(model.supported_parameters)
    }));
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.retryAttempts) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error('Request failed after all retry attempts');
  }

  /**
   * Handle error responses from OpenRouter
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json() as { error?: { message?: string } };
      errorMessage = errorData.error?.message ?? errorMessage;
    } catch {
      // Ignore JSON parsing errors, use default message
    }

    switch (response.status) {
      case 401:
        throw new AuthenticationError(errorMessage);
      case 429:
        throw new RateLimitError(errorMessage);
      case 404:
        throw new ModelNotFoundError('Model not found');
      default:
        throw new ConnectionError(errorMessage);
    }
  }

  /**
   * Extract provider from model ID
   */
  private extractProvider(modelId: string): string {
    const parts = modelId.split('/');
    return parts[0] ?? 'unknown';
  }

  /**
   * Parse pricing string to number
   */
  private parsePricing(pricing: string): number {
    const match = pricing.match(/\$([\d.]+)/);
    return match && match[1] !== undefined ? parseFloat(match[1]) : 0;
  }

  /**
   * Check if model supports tools
   */
  private supportsTools(supportedParameters: string[]): boolean {
    return supportedParameters.includes('tools') && supportedParameters.includes('tool_choice');
  }
} 