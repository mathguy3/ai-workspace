import React, { useState, useEffect } from 'react';
import { AIModel } from '../../shared/types/ai-manager';
import { useElectronAPI } from '../contexts/ElectronAPIContext';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (settings: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'api' | 'models'>('api');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showToolsOnly, setShowToolsOnly] = useState(false);

  const aiManager = useElectronAPI();

  useEffect(() => {
    loadModels();
  }, [aiManager]);

  // Filter models based on checkbox states
  useEffect(() => {
    let filtered = [...models];
    
    if (showFreeOnly) {
      filtered = filtered.filter(model => {
        // Only consider a model "free" if it has no pricing or both input and output are exactly 0
        return !model.pricing || 
               (model.pricing.input === 0 && model.pricing.output === 0);
      });
    }
    
    if (showToolsOnly) {
      filtered = filtered.filter(model => {
        return model.capabilities && model.capabilities.includes('tools');
      });
    }
    
    setFilteredModels(filtered);
  }, [models, showFreeOnly, showToolsOnly]);

  const loadModels = async () => {
    try {
      const models = await aiManager.getAvailableModels();
      setModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setValidationMessage('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setValidationMessage('');

    try {
      const isValid = await aiManager.validateApiKey(apiKey);
      if (isValid) {
        setValidationMessage('✅ API key is valid');
      } else {
        setValidationMessage('❌ Invalid API key');
      }
    } catch (error) {
      setValidationMessage('❌ Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setValidationMessage('Please enter an API key');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        apiKey: apiKey.trim(),
        defaultModel: selectedModel || models[0]?.id
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeTab === 'api') {
        validateApiKey();
      }
    }
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            API Key
          </button>
          <button
            className={`tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
        </div>

        {/* API Key Tab */}
        <div className={`tab-content ${activeTab === 'api' ? 'active' : ''}`}>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="form-input password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your API key..."
            />
          </div>

          <button
            className="save-button"
            onClick={validateApiKey}
            disabled={isValidating || !apiKey.trim()}
          >
            {isValidating ? 'Validating...' : 'Validate API Key'}
          </button>

          {validationMessage && (
            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: validationMessage.includes('✅') ? '#f0f9ff' : '#fef2f2',
              color: validationMessage.includes('✅') ? '#0369a1' : '#dc2626',
              fontSize: '0.9rem'
            }}>
              {validationMessage}
            </div>
          )}
        </div>

        {/* Models Tab */}
        <div className={`tab-content ${activeTab === 'models' ? 'active' : ''}`}>
          <div className="form-group">
            <label className="form-label">Model Filters</label>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input
                  type="checkbox"
                  checked={showFreeOnly}
                  onChange={(e) => setShowFreeOnly(e.target.checked)}
                  style={{ margin: 0 }}
                />
                Show free models only
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input
                  type="checkbox"
                  checked={showToolsOnly}
                  onChange={(e) => setShowToolsOnly(e.target.checked)}
                  style={{ margin: 0 }}
                />
                Show models with tools support
              </label>
              {(showFreeOnly || showToolsOnly) && (
                <button
                  onClick={() => {
                    setShowFreeOnly(false);
                    setShowToolsOnly(false);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Select Default Model 
              {filteredModels.length !== models.length && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: '#666', 
                  fontWeight: 'normal',
                  marginLeft: '0.5rem'
                }}>
                  ({filteredModels.length} of {models.length} models)
                </span>
              )}
            </label>
            {models.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                No models available. Please check your API key first.
              </div>
            ) : filteredModels.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                No models match the current filters. Try adjusting your filter settings.
              </div>
            ) : (
              <div className="models-list">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className={`model-item ${selectedModel === model.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedModel(model.id);
                      console.log('model.id', model.id);
                    }}
                  >
                    <div className="model-name">{model.name}</div>
                    <div className="model-provider">
                      {model.provider}
                      {model.contextLength && ` • ${model.contextLength.toLocaleString()} tokens`}
                      {model.capabilities && model.capabilities.length > 0 && 
                        ` • ${model.capabilities.join(', ')}`
                      }
                      {model.pricing && (
                        <span style={{ 
                          color: model.pricing.input === 0 && model.pricing.output === 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {model.pricing.input === 0 && model.pricing.output === 0 
                            ? ' • FREE' 
                            : ` • $${model.pricing.input}/${model.pricing.output} per 1K tokens`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="save-button"
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim()}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsModal; 