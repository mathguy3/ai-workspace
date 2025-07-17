import { AIManagerStatus } from '../types/index.js';

/**
 * Manages the status of the AI Manager
 * Handles status transitions and provides status details
 */
export class StatusManager {
  private currentStatus: AIManagerStatus = 'idle';
  private statusDetails: string | undefined = undefined;
  private statusHistory: Array<{
    status: AIManagerStatus;
    details?: string;
    timestamp: Date;
  }> = [];

  /**
   * Get the current status
   */
  getStatus(): AIManagerStatus {
    return this.currentStatus;
  }

  /**
   * Get current status details
   */
  getStatusDetails(): string | undefined {
    return this.statusDetails;
  }

  /**
   * Set the status with optional details
   */
  setStatus(status: AIManagerStatus, details?: string): void {
    const previousStatus = this.currentStatus;
    
    this.currentStatus = status;
    this.statusDetails = details ?? undefined;
    
    // Record status change in history
    this.statusHistory.push({
      status,
      ...(details !== undefined && { details }),
      timestamp: new Date()
    });

    // Keep only last 50 status changes
    if (this.statusHistory.length > 50) {
      this.statusHistory = this.statusHistory.slice(-50);
    }

    console.debug(`Status changed from ${previousStatus} to ${status}${details ? `: ${details}` : ''}`);
  }

  /**
   * Check if the manager is currently busy
   */
  isBusy(): boolean {
    return this.currentStatus === 'thinking' || this.currentStatus === 'working';
  }

  /**
   * Check if the manager is in an error state
   */
  isError(): boolean {
    return this.currentStatus === 'error';
  }

  /**
   * Get status history
   */
  getStatusHistory(): Array<{
    status: AIManagerStatus;
    details?: string;
    timestamp: Date;
  }> {
    return [...this.statusHistory];
  }

  /**
   * Clear status history
   */
  clearHistory(): void {
    this.statusHistory = [];
  }

  /**
   * Get the time spent in the current status
   */
  getCurrentStatusDuration(): number {
    const lastEntry = this.statusHistory[this.statusHistory.length - 1];
    if (!lastEntry) return 0;
    
    return Date.now() - lastEntry.timestamp.getTime();
  }

  /**
   * Reset to idle status
   */
  reset(): void {
    this.setStatus('idle');
  }
} 