# AI Interface Electron App

A modern, lightweight Electron application that provides a beautiful chat interface for AI interactions. The app is designed to work with the `@daniel/ai-api` npm package and supports async message handling.

## Features

- 🎨 **Modern UI**: Clean, responsive design with smooth animations
- 💬 **Real-time Chat**: Send messages and receive AI responses
- ⚙️ **Settings Modal**: Two-tab interface for API key and model management
- 🔄 **Async Support**: Handles messages sent by the AI manager at any time
- 🛡️ **Secure**: API keys are handled securely through the main process
- 📱 **Responsive**: Works well on different window sizes

## Project Structure

```
electron-ui/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main process entry point
│   │   └── preload.ts       # Preload script for secure IPC
│   ├── renderer/            # React renderer process
│   │   ├── components/      # React components
│   │   │   ├── ChatInterface.tsx
│   │   │   └── SettingsModal.tsx
│   │   ├── contexts/        # React contexts
│   │   │   └── ElectronAPIContext.tsx
│   │   ├── App.tsx          # Main React component
│   │   ├── main.tsx         # React entry point
│   │   └── index.css        # Global styles
│   └── shared/              # Shared types and interfaces
│       └── types/
│           └── ai-manager.ts # AI library interface definitions
├── dist/                    # Built files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## AI Library Interface

The app expects the `@daniel/ai-api` npm package that implements the `AIManager` interface defined in `src/shared/types/ai-manager.ts`.

### Provider Pattern

The app uses `ElectronAPIProvider` to inject the AI Manager. The manager should be imported from the npm package and provided directly:

```typescript
import { aiManager } from '@daniel/ai-api';
import { ElectronAPIProvider } from './src/renderer/contexts/ElectronAPIContext';

// The aiManager from @daniel/ai-api should implement the AIManager interface
<ElectronAPIProvider api={aiManager}>
  <App />
</ElectronAPIProvider>
```

### Expected Interface

The `@daniel/ai-api` package should implement the following interface:

```typescript
interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  model?: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  capabilities?: string[];
  pricing?: {
    input: number;
    output: number;
  };
}

interface AISettings {
  apiKey: string;
  defaultModel: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}
```

### Required Methods

The AI manager must implement these methods:

```typescript
interface AIManager {
  // Initialization
  initialize(settings: AISettings): Promise<void>;
  destroy(): Promise<void>;
  
  // Message handling
  sendMessage(content: string, options?: SendMessageOptions): Promise<SendMessageResult>;
  
  // Settings management
  updateSettings(settings: Partial<AISettings>): Promise<void>;
  getSettings(): AISettings;
  
  // Model management
  getAvailableModels(): Promise<AIModel[]>;
  getModelById(id: string): Promise<AIModel | null>;
  filterModels(criteria: FilterCriteria): Promise<AIModel[]>;
  
  // Event handling (for async messages)
  on(event: keyof AIManagerEvents, callback: Function): void;
  off(event: keyof AIManagerEvents, callback: Function): void;
  
  // Connection and validation
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
  validateApiKey(apiKey: string): Promise<boolean>;
}
```

### Event System

The AI manager should emit these events for async communication:

```typescript
interface AIManagerEvents {
  onMessageReceived: (message: AIMessage) => void;
  onError: (error: Error) => void;
  onConnectionStatusChanged: (connected: boolean) => void;
  onModelsUpdated: (models: AIModel[]) => void;
}
```

## Setup and Installation

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd electron-ui
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Using yarn
   yarn install
   
   # Using bun
   bun install
   ```

3. **Set up environment variables** (optional):
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env and add your API key
   VITE_OPENROUTER_API_KEY=your-actual-api-key-here
   ```

4. **Development**
   ```bash
   # Using npm
   npm run dev
   
   # Using yarn
   yarn dev
   
   # Using bun
   bun run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run dist
   ```

## Integration with AI Library

To integrate the `@daniel/ai-api` package:

1. **Import the AI Manager**:
   ```typescript
   import { aiManager } from '@daniel/ai-api';
   ```

2. **Update the main.tsx file**:
   ```typescript
   // Replace the mock AI manager with the real one
   import { aiManager } from '@daniel/ai-api';
   
   root.render(
     <React.StrictMode>
       <ElectronAPIProvider api={aiManager}>
         <App />
       </ElectronAPIProvider>
     </React.StrictMode>
   );
   ```

3. **The aiManager should implement the AIManager interface**:
   ```typescript
   interface AIManager {
     // Initialization
     initialize(settings: AISettings): Promise<void>;
     destroy(): Promise<void>;
     
     // Message handling
     sendMessage(content: string, options?: SendMessageOptions): Promise<SendMessageResult>;
     
     // Settings management
     updateSettings(settings: Partial<AISettings>): Promise<void>;
     getSettings(): AISettings;
     
     // Model management
     getAvailableModels(): Promise<AIModel[]>;
     getModelById(id: string): Promise<AIModel | null>;
     filterModels(criteria: FilterCriteria): Promise<AIModel[]>;
     
     // Event handling
     on(event: keyof AIManagerEvents, callback: Function): void;
     off(event: keyof AIManagerEvents, callback: Function): void;
     
     // Connection and validation
     isConnected(): boolean;
     testConnection(): Promise<boolean>;
     validateApiKey(apiKey: string): Promise<boolean>;
   }
   ```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run dist` - Create distributable packages
- `npm run start` - Start the built app

### Architecture

- **Main Process**: Handles app lifecycle and IPC communication
- **Renderer Process**: React-based UI with TypeScript and Context Provider pattern
- **Preload Script**: Secure bridge between main and renderer processes
- **Context Provider**: Dependency injection for the AI API package
- **Shared Types**: Common interfaces for AI manager communication

### Key Features

1. **Async Message Support**: The app listens for `onMessageReceived` events and displays them in real-time
2. **Settings Management**: Two-tab modal for API key validation and model selection
3. **Error Handling**: Comprehensive error handling with user-friendly messages
4. **Connection Status**: Visual indicators for connection state
5. **Responsive Design**: Works well on different screen sizes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 