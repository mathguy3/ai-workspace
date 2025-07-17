import { AIManagerEvents } from '../types/index.js';

/**
 * A robust event emitter for the AI Manager
 * Handles event registration, emission, and cleanup
 */
export class EventEmitter {
  private events: Map<keyof AIManagerEvents, Set<AIManagerEvents[keyof AIManagerEvents]>> = new Map();

  /**
   * Register an event listener
   */
  on<K extends keyof AIManagerEvents>(event: K, callback: AIManagerEvents[K]): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback as AIManagerEvents[keyof AIManagerEvents]);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof AIManagerEvents>(event: K, callback: AIManagerEvents[K]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback as AIManagerEvents[keyof AIManagerEvents]);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  emit<K extends keyof AIManagerEvents>(event: K, ...args: Parameters<AIManagerEvents[K]>): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          (callback as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  clear(): void {
    this.events.clear();
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: keyof AIManagerEvents): number {
    return this.events.get(event)?.size ?? 0;
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): (keyof AIManagerEvents)[] {
    return Array.from(this.events.keys());
  }
} 