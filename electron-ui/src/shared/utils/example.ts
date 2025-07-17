// Example usage of the API client
// This file demonstrates how to use the APIClient in your application

import { createAPIClient } from './api-client';
import { AISettings } from '../types/ai-manager';

async function exampleUsage() {
  // Create API client instance
  const apiClient = createAPIClient('http://localhost:3000');

  // Initialize with your OpenRouter API key
  const settings: AISettings = {
    apiKey: 'your-openrouter-api-key-here',
    defaultModel: 'anthropic/claude-3-haiku',
    maxTokens: 4096,
    temperature: 0.7
  };

  try {
    // Initialize the client
    await apiClient.initialize(settings);
    console.log('API Client initialized successfully');

    // Set up event listeners
    apiClient.on('onMessageReceived', (message) => {
      console.log('Received message:', message.content);
    });

    apiClient.on('onError', (error) => {
      console.error('AI Error:', error.message);
    });

    apiClient.on('onConnectionStatusChanged', (connected) => {
      console.log('Connection status:', connected ? 'Connected' : 'Disconnected');
    });

    // Create a new conversation
    const conversationId = await apiClient.createConversation({
      model: 'anthropic/claude-3-haiku',
      systemPrompt: 'You are a helpful coding assistant.'
    });
    console.log('Created conversation:', conversationId);

    // Send a message
    const result = await apiClient.sendMessage('Hello! Can you help me with some coding?');
    console.log('AI Response:', result.message.content);

    // Get available models
    const models = await apiClient.getAvailableModels();
    console.log('Available models:', models.length);

    // Get usage statistics
    const usage = await apiClient.getUsageStats();
    console.log('Usage stats:', usage);

    // Clean up
    await apiClient.destroy();
    console.log('API Client destroyed');

  } catch (error) {
    console.error('Error using API client:', error);
  }
}

// Example of conversation management
async function conversationExample() {
  const apiClient = createAPIClient('http://localhost:3000');

  try {
    await apiClient.initialize({
      apiKey: 'your-api-key',
      defaultModel: 'anthropic/claude-3-haiku'
    });

    // Create multiple conversations
    const conv1 = await apiClient.createConversation({
      model: 'anthropic/claude-3-haiku',
      systemPrompt: 'You are a coding assistant.'
    });

    const conv2 = await apiClient.createConversation({
      model: 'anthropic/claude-3-sonnet',
      systemPrompt: 'You are a creative writing assistant.'
    });

    // Send messages to different conversations
    await apiClient.sendMessage('Write a function to sort an array', { model: 'anthropic/claude-3-haiku' });
    await apiClient.sendMessage('Write a short story about a robot', { model: 'anthropic/claude-3-sonnet' });

    // Get all conversations
    const conversations = await apiClient.getConversations();
    console.log('All conversations:', conversations);

    // Get specific conversation details
    const convDetails = await apiClient.getConversation(conv1);
    console.log('Conversation details:', convDetails);

    // Update conversation settings
    await apiClient.updateConversation(conv1, {
      model: 'anthropic/claude-3-sonnet',
      systemPrompt: 'You are an advanced coding assistant.'
    });

    // Delete a conversation
    await apiClient.deleteConversation(conv2);

  } catch (error) {
    console.error('Error in conversation example:', error);
  } finally {
    await apiClient.destroy();
  }
}

// Example of error handling
async function errorHandlingExample() {
  const apiClient = createAPIClient('http://localhost:3000');

  try {
    // This will fail if the API server is not running
    await apiClient.initialize({
      apiKey: 'invalid-key',
      defaultModel: 'test-model'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Initialization failed:', error.message);
    }
  } finally {
    await apiClient.destroy();
  }
}

// Export examples for use in documentation
export { exampleUsage, conversationExample, errorHandlingExample }; 