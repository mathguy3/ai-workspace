import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { AIManager } from '../coordinator/index';
import { WebSocketManager } from './websocket/manager';
import { ConversationsRoutes } from './routes/conversations';
import { ModelsRoutes } from './routes/models';
import { 
  validateContentType, 
  validateRequestSize, 
  validateRateLimit 
} from './middleware/validation';
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler 
} from './middleware/error-handler';

export class APIServer {
  private app: express.Application;
  private server: any;
  private aiManager: AIManager;
  private wsManager!: WebSocketManager;
  private port: number;
  private conversationsRoutes: ConversationsRoutes | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.aiManager = new AIManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Request timeout
    this.app.use(timeoutHandler(30000));
    
    // Request size validation
    this.app.use(validateRequestSize(1024 * 1024)); // 1MB
    
    // Content-Type validation
    this.app.use(validateContentType);
    
    // Rate limiting
    this.app.use(validateRateLimit(10000, 15 * 60 * 1000)); // 100 requests per 15 minutes
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        aiManagerStatus: this.aiManager.getStatus()
      });
    });

    // API routes - create without wsManager initially
    this.conversationsRoutes = new ConversationsRoutes(this.aiManager, null as any);
    this.app.use('/api/v1/conversations', this.conversationsRoutes.getRouter());
    this.app.use('/api/v1/models', new ModelsRoutes(this.aiManager).getRouter());
    
    // Status endpoint
    this.app.get('/api/v1/status', (req, res) => {
      res.json({
        status: this.aiManager.getStatus(),
        details: this.aiManager.getStatusDetails(),
        connected: this.aiManager.isConnected(),
        wsStats: this.wsManager.getStats()
      });
    });

    // Settings management
    this.app.get('/api/v1/settings', (req, res) => {
      res.json(this.aiManager.getSettings());
    });

    this.app.put('/api/v1/settings', async (req, res) => {
      try {
        await this.aiManager.updateSettings(req.body);
        res.json({ message: 'Settings updated successfully' });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Test connection
    this.app.post('/api/v1/test-connection', async (req, res) => {
      try {
        const connected = await this.aiManager.testConnection();
        res.json({ connected });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Usage stats
    this.app.get('/api/v1/usage', async (req, res) => {
      try {
        const stats = await this.aiManager.getUsageStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // 404 handler
    this.app.use('/', notFoundHandler);

    // Error handler
    this.app.use(errorHandler);
  }

  public async initialize(settings: any): Promise<void> {
    try {
      console.log('Initializing AI Manager...');
      await this.aiManager.initialize(settings);
      
      console.log('Creating HTTP server...');
      this.server = createServer(this.app);
      
      console.log('Setting up WebSocket manager...');
      this.wsManager = new WebSocketManager(this.server);
      
      // Update conversations routes with wsManager
      if (this.conversationsRoutes) {
        this.conversationsRoutes.setWebSocketManager(this.wsManager);
      }
      
      console.log('AI Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Manager:', error);
      throw error;
    }
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 API Server running on port ${this.port}`);
      console.log(`📡 WebSocket available at ws://localhost:${this.port}/ws`);
      console.log(`🔗 Health check: http://localhost:${this.port}/health`);
      console.log(`📊 API docs: http://localhost:${this.port}/api/v1/status`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      console.log('API Server stopped');
    }
  }

  public getAIManager(): AIManager {
    return this.aiManager;
  }

  public getWebSocketManager(): WebSocketManager {
    return this.wsManager;
  }
}

// CLI entry point
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new APIServer(port);

  // Default settings - you should load these from environment variables
  const settings = {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultModel: process.env.DEFAULT_MODEL || 'mistralai/mistral-7b-instruct',
    maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10)
  };

  if (!settings.apiKey) {
    console.error('❌ OPENROUTER_API_KEY environment variable is required');
    process.exit(1);
  }

  server.initialize(settings)
    .then(() => {
      server.start();
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.stop();
    process.exit(0);
  });
} 