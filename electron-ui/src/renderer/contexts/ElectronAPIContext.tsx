import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { AIManager } from '../../shared/types/ai-manager';
import { getAIManagerMode } from '../../shared/config';

// Create the context using the AIManager interface
const ElectronAPIContext = createContext<AIManager | null>(null);

// Provider component
interface ElectronAPIProviderProps {
  api: AIManager;
  children: ReactNode;
}

export const ElectronAPIProvider: React.FC<ElectronAPIProviderProps> = ({ api, children }) => {
    console.log('ElectronAPIProvider initialized with:', getAIManagerMode());
    
    // Only auto-initialize if we have an environment API key
    useEffect(() => {
        const envApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        console.log('envApiKey', envApiKey);
        if (envApiKey && getAIManagerMode() === 'api') {
            console.log('Auto-initializing API client with environment API key');
            console.log('model', import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-r1-0528:free');
            api.initialize({
                apiKey: envApiKey,
                defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-r1-0528:free',
                maxTokens: parseInt(import.meta.env.VITE_MAX_TOKENS || '4096'),
                temperature: parseFloat(import.meta.env.VITE_TEMPERATURE || '0.7'),
                topP: parseFloat(import.meta.env.VITE_TOP_P || '1'),
            }).catch((error) => {
                console.error('Failed to auto-initialize API client:', error);
            });
        }
    }, [api]);
    
    return (
        <ElectronAPIContext.Provider value={api}>
            {children}
        </ElectronAPIContext.Provider>
    );
};

// Custom hook to use the AI manager
export const useElectronAPI = (): AIManager => {
  const context = useContext(ElectronAPIContext);
  if (!context) {
    throw new Error('useElectronAPI must be used within an ElectronAPIProvider');
  }
  return context;
};

// Export the context for external libraries to use
export { ElectronAPIContext }; 