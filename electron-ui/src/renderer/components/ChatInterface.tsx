import React, { useState, useRef, useEffect } from 'react';
import { AIMessage } from '../../shared/types/ai-manager';

interface ChatInterfaceProps {
  messages: AIMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  onRefreshConnection?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isConnected,
  error,
  onRefreshConnection
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date | string) => {
    // Handle both Date objects and date strings
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }
    
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      {/* Connection Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.9rem',
        gap: '1rem'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#ef4444',
          }} />
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
        
        {onRefreshConnection && (
          <button
            onClick={onRefreshConnection}
            title="Refresh connection"
            style={{
              marginLeft: 'auto',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            marginTop: '2rem',
            fontStyle: 'italic'
          }}>
            Start a conversation with the AI...
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className="message-content">
              <div>{message.content}</div>
              <div style={{ 
                fontSize: '0.75rem', 
                opacity: 0.7, 
                marginTop: '0.5rem' 
              }}>
                {formatTime(message.timestamp)}
                {message.model && ` • ${message.model}`}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">AI</div>
            <div className="message-content">
              <div className="loading"></div>
              <span style={{ marginLeft: '0.5rem' }}>Thinking...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ 
            textAlign: 'center', 
            color: '#e74c3c', 
            padding: '1rem',
            backgroundColor: '#fdf2f2',
            borderRadius: '8px',
            margin: '1rem 0'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || !isConnected}
            rows={1}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputValue.trim() || isLoading || !isConnected}
          >
            {isLoading ? (
              <div className="loading"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        {!isConnected && (
          <div style={{ 
            textAlign: 'center', 
            color: '#e67e22', 
            fontSize: '0.9rem',
            marginTop: '0.5rem'
          }}>
            ⚠️ Not connected. Please check your settings.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 