// Configuration for the AI Manager
export const config = {
  // Set to true to use the API client, false to use the mock
  useAPIClient: true, // Temporarily set to false for testing
  
  // API server configuration
  apiServer: {
    baseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    timeout: 30000, // 30 seconds
    maxReconnectAttempts: 5,
    reconnectDelay: 10000, // 1 second
  },
  
  // Development settings
  development: {
    enableLogging: true,
    mockMode: false, // Set to true to force mock mode even if useAPIClient is true
  }
};

// Helper function to get the current AI manager mode
export function getAIManagerMode(): 'api' | 'mock' {
  if (config.development.mockMode) {
    return 'mock';
  }
  return config.useAPIClient ? 'api' : 'mock';
} 