import { AIMessage, Conversation, ConversationSettings } from '../types/index.js';

/**
 * Manages conversations and message history
 * Handles conversation creation, updates, and retrieval
 */
export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();

  /**
   * Create a new conversation
   */
  createConversation(id?: string, settings?: ConversationSettings): Conversation {
    const conversationId = id ?? this.generateConversationId();
    const conversation: Conversation = {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(settings && { settings: { ...settings } }),
      metadata: {}
    };

    this.conversations.set(conversationId, conversation);
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  getConversation(id: string): Conversation | null {
    return this.conversations.get(id) ?? null;
  }

  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, message: AIMessage): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    return true;
  }

  /**
   * Get all messages from a conversation
   */
  getMessages(conversationId: string): AIMessage[] {
    const conversation = this.conversations.get(conversationId);
    return conversation?.messages ?? [];
  }

  /**
   * Get recent messages from a conversation (last N messages)
   */
  getRecentMessages(conversationId: string, count: number): AIMessage[] {
    const messages = this.getMessages(conversationId);
    return messages.slice(-count);
  }

  /**
   * Update conversation metadata
   */
  updateMetadata(conversationId: string, metadata: Record<string, unknown>): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    conversation.metadata = { ...conversation.metadata, ...metadata };
    conversation.updatedAt = new Date();
    return true;
  }

  /**
   * Update conversation settings
   */
  updateSettings(conversationId: string, settings: Partial<ConversationSettings>): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    conversation.settings = { ...conversation.settings, ...settings };
    conversation.updatedAt = new Date();
    return true;
  }

  /**
   * Get conversation settings
   */
  getSettings(conversationId: string): ConversationSettings | null {
    const conversation = this.conversations.get(conversationId);
    return conversation?.settings ?? null;
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }

  /**
   * List all conversations
   */
  listConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Get conversations sorted by last activity
   */
  getConversationsByActivity(): Conversation[] {
    return this.listConversations().sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Clear all conversations
   */
  clearAll(): void {
    this.conversations.clear();
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
  } {
    const conversations = this.listConversations();
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const averageMessagesPerConversation = totalConversations > 0 
      ? totalMessages / totalConversations 
      : 0;

    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation
    };
  }

  /**
   * Generate a unique conversation ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 