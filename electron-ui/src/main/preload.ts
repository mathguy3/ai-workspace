import { contextBridge, ipcRenderer } from 'electron';

// Create the electron API object for IPC communication
const electronAPI = {
  // AI Manager methods
  aiManager: {
    initialize: (settings: any) => ipcRenderer.invoke('ai-manager:initialize', settings),
    sendMessage: (content: string, options?: any) => ipcRenderer.invoke('ai-manager:send-message', content, options),
    getModels: () => ipcRenderer.invoke('ai-manager:get-models'),
    updateSettings: (settings: any) => ipcRenderer.invoke('ai-manager:update-settings', settings),
    validateApiKey: (apiKey: string) => ipcRenderer.invoke('ai-manager:validate-api-key', apiKey),
  },
  
  // Event listeners for async messages
  onMessageReceived: (callback: (message: any) => void) => {
    ipcRenderer.on('ai-manager:message-received', (event, message) => callback(message));
  },
  
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on('ai-manager:error', (event, error) => callback(error));
  },
  
  onConnectionStatusChanged: (callback: (connected: boolean) => void) => {
    ipcRenderer.on('ai-manager:connection-status', (event, connected) => callback(connected));
  },
  
  onModelsUpdated: (callback: (models: any[]) => void) => {
    ipcRenderer.on('ai-manager:models-updated', (event, models) => callback(models));
  },
  
  // Remove event listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API for the npm package to use
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      aiManager: {
        initialize: (settings: any) => Promise<{ success: boolean; error?: string }>;
        sendMessage: (content: string, options?: any) => Promise<{ success: boolean; result?: any; error?: string }>;
        getModels: () => Promise<{ success: boolean; models?: any[]; error?: string }>;
        updateSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
        validateApiKey: (apiKey: string) => Promise<{ success: boolean; isValid?: boolean; error?: string }>;
      };
      onMessageReceived: (callback: (message: any) => void) => void;
      onError: (callback: (error: any) => void) => void;
      onConnectionStatusChanged: (callback: (connected: boolean) => void) => void;
      onModelsUpdated: (callback: (models: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 