/**
 * Simple event emitter service for EXIF key processing events
 * Phase 3: Event-driven architecture without external dependencies
 */

import { Injectable } from '@nestjs/common';

export interface EventHandler {
  (event: any): void;
}

@Injectable()
export class ExifKeysEventEmitterService {
  private listeners = new Map<string, EventHandler[]>();

  /**
   * Emit an event with data
   */
  emit(eventName: string, data: any): void {
    const handlers = this.listeners.get(eventName) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        // Log error but don't stop other handlers
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event
   */
  on(eventName: string, handler: EventHandler): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const handlers = this.listeners.get(eventName)!;
    handlers.push(handler);
  }

  /**
   * Remove event listener
   */
  off(eventName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName: string): void {
    this.listeners.delete(eventName);
  }

  /**
   * Get all event names
   */
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.length || 0;
  }
}
