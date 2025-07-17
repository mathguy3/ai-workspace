import { Router, Request, Response } from 'express';
import { AIManager } from '../../coordinator';
import { GetModelsResponse, APIError } from '../types';

export class ModelsRoutes {
  private router: Router;
  private aiManager: AIManager;

  constructor(aiManager: AIManager) {
    this.router = Router();
    this.aiManager = aiManager;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get all available models
    this.router.get('/', this.getModels.bind(this));
    
    // Filter models by criteria (must come before :modelId to avoid conflicts)
    this.router.post('/filter', this.filterModels.bind(this));
    
    // Get a specific model by ID
    this.router.get('/:modelId', this.getModelById.bind(this));
  }

  private async getModels(req: Request, res: Response): Promise<void> {
    try {
      const models = await this.aiManager.getAvailableModels();
      
      const response: GetModelsResponse = { models };
      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to get models');
    }
  }

  private async getModelById(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      const model = await this.aiManager.getModelById(modelId);
      
      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.json({ model });
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to get model');
    }
  }

  private async filterModels(req: Request, res: Response): Promise<void> {
    try {
      const { provider, capabilities, maxContextLength } = req.body;
      
      const models = await this.aiManager.filterModels({
        provider,
        capabilities,
        maxContextLength
      });

      const response: GetModelsResponse = { models };
      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error, 'Failed to filter models');
    }
  }

  private handleError(res: Response, error: Error, defaultMessage: string): void {
    console.error('API Error:', error);
    
    const apiError: APIError = {
      error: 'Internal Server Error',
      message: error.message || defaultMessage,
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    res.status(500).json(apiError);
  }

  public getRouter(): Router {
    return this.router;
  }
} 