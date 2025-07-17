import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import { AIMessage } from '../shared/types/ai-manager';
import { useElectronAPI } from './contexts/ElectronAPIContext';
import { getAIManagerMode } from '../shared/config';

const App: React.FC = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bffStatus, setBffStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [openrouterStatus, setOpenrouterStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const aiManager = useElectronAPI();
  
  // Debug: Log which AI manager is being used
  useEffect(() => {
    console.log('AI Manager type:', getAIManagerMode());
    console.log('AI Manager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(aiManager)));
  }, [aiManager]);

  // Connection status checking
  useEffect(() => {
    let cancelled = false;
    let intervalId: NodeJS.Timeout;

    async function checkConnections() {
      if (cancelled) return;

      try {
        // Check BFF API
        const bffRes = await fetch('http://localhost:3000/health');
        if (bffRes.ok) {
          const bffData = await bffRes.json();
          if (!cancelled) {
            setBffStatus('ok');
          }
        } else {
          if (!cancelled) {
            setBffStatus('error');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setBffStatus('error');
        }
      }

      try {
        // Check OpenRouter API
        const orRes = await fetch('http://localhost:3000/api/v1/test-connection', { method: 'POST' });
        if (orRes.ok) {
          const orData = await orRes.json();
          if (!cancelled) {
            setOpenrouterStatus(orData.connected ? 'ok' : 'error');
          }
        } else {
          if (!cancelled) {
            setOpenrouterStatus('error');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setOpenrouterStatus('error');
        }
      }

      // Update overall connection status
      if (!cancelled) {
        setIsConnected(bffStatus === 'ok' && openrouterStatus === 'ok');
      }
    }

    // Initial check
    checkConnections();
    
    // Poll every second
    intervalId = setInterval(checkConnections, 10000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [bffStatus, openrouterStatus]);

  // Set up event listeners for async messages from AI manager
  useEffect(() => {
    const handleMessageReceived = (message: AIMessage) => {
      console.log('handleMessageReceived', message);
      setMessages(prev => [...prev, message]);
      setError(null);
    };

    const handleError = (error: any) => {
      setError(error.message || 'An error occurred');
      setIsLoading(false);
    };

    const handleConnectionStatus = (connected: boolean) => {
      console.log('Connection status changed:', connected);
      setIsConnected(connected);
    };

    // Set up event listeners
    aiManager.on('onMessageReceived', handleMessageReceived);
    aiManager.on('onError', handleError);
    aiManager.on('onConnectionStatusChanged', handleConnectionStatus);

    // Cleanup
    return () => {
      aiManager.off('onMessageReceived', handleMessageReceived);
      aiManager.off('onError', handleError);
      aiManager.off('onConnectionStatusChanged', handleConnectionStatus);
    };
  }, [aiManager]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiManager.sendMessage(content);
      if (result.error) {
        setError(result.error);
      } else if (result.message) {
        // Add the response message to the messages list
        setMessages(prev => [...prev, result.message]);
      }
      console.log('result', result);
    } catch (err: any) {
      console.error('Send message error:', err);
      
      // Check if it's an initialization error
      if (err.code === 'NOT_INITIALIZED') {
        setError('Please configure your API settings first. Click the settings button to enter your API key.');
        setIsSettingsOpen(true); // Automatically open settings
      } else {
        setError(err.message || 'Failed to send message');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsSave = async (settings: any) => {
    try {
      // If using API client, initialize it with the new settings
      if (getAIManagerMode() === 'api') {
        console.log('Initializing API client with new settings...');
        await aiManager.initialize(settings);
        console.log('API client initialized successfully');
      } else {
        // For mock mode, just update settings
        await aiManager.updateSettings(settings);
      }
      
      setIsSettingsOpen(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please check your API key and try again.');
    }
  };

  const handleRefreshConnection = async () => {
    setBffStatus('loading');
    setOpenrouterStatus('loading');
    
    try {
      // Check BFF API
      const bffRes = await fetch('http://localhost:3000/health');
      if (bffRes.ok) {
        setBffStatus('ok');
      } else {
        setBffStatus('error');
      }
    } catch (e) {
      setBffStatus('error');
    }

    try {
      // Check OpenRouter API
      const orRes = await fetch('http://localhost:3000/api/v1/test-connection', { method: 'POST' });
      if (orRes.ok) {
        const orData = await orRes.json();
        setOpenrouterStatus(orData.connected ? 'ok' : 'error');
      } else {
        setOpenrouterStatus('error');
      }
    } catch (e) {
      setOpenrouterStatus('error');
    }

    // Update overall connection status
    setIsConnected(bffStatus === 'ok' && openrouterStatus === 'ok');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI Interface</h1>
        <button 
          className="settings-button"
          onClick={() => setIsSettingsOpen(true)}
        >
          ⚙️ Settings
        </button>
      </header>

      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isConnected={isConnected}
        error={error}
        onRefreshConnection={handleRefreshConnection}
      />

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  );
};

export default App; 