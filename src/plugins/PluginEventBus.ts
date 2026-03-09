/**
 * PluginEventBus — Event emitter for plugin lifecycle events
 * 
 * [DEF-005] Part of the fully-featured but completely UNUSED plugin system.
 * This event bus fires lifecycle events on every HTTP request, but since
 * zero plugins are registered, no listeners ever respond. ~130 lines of
 * dead infrastructure.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import logger from '../utils/logger.js';

export type PluginEventType =
  | 'request:start'
  | 'request:end'
  | 'request:error'
  | 'metric:ingest'
  | 'metric:query'
  | 'plugin:init'
  | 'plugin:start'
  | 'plugin:stop'
  | 'plugin:error';

export interface PluginEvent {
  type: PluginEventType;
  timestamp: Date;
  data?: unknown;
  source?: string;
}

export type PluginEventHandler = (event: PluginEvent) => void | Promise<void>;

export class PluginEventBus {
  private handlers: Map<PluginEventType, PluginEventHandler[]>;
  private eventLog: PluginEvent[];
  private maxLogSize: number;

  constructor(maxLogSize: number = 1000) {
    this.handlers = new Map();
    this.eventLog = [];
    this.maxLogSize = maxLogSize;
  }

  /**
   * Register an event handler for a specific event type.
   * [DEF-005] Nobody calls this — zero plugins are registered.
   */
  on(eventType: PluginEventType, handler: PluginEventHandler): void {
    logger.debug(`PluginEventBus: Registering handler for '${eventType}'`);

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Remove a specific event handler.
   */
  off(eventType: PluginEventType, handler: PluginEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all registered handlers.
   * [DEF-005] Events fire on every request but nobody is listening.
   */
  async emit(eventType: PluginEventType, data?: unknown, source?: string): Promise<void> {
    const event: PluginEvent = {
      type: eventType,
      timestamp: new Date(),
      data,
      source,
    };

    // Log the event
    this.logEvent(event);

    logger.debug(`PluginEventBus: Emitting '${eventType}' (${this.getHandlerCount(eventType)} handlers)`);

    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.warn(`PluginEventBus: Handler error for '${eventType}':`, (error as Error).message);
        // Fire error event (but nobody listens to that either)
        if (eventType !== 'plugin:error') {
          await this.emit('plugin:error', { originalEvent: eventType, error }, 'PluginEventBus');
        }
      }
    }
  }

  /**
   * Get the number of handlers registered for an event type.
   */
  getHandlerCount(eventType: PluginEventType): number {
    return (this.handlers.get(eventType) || []).length;
  }

  /**
   * Get all registered event types.
   */
  getRegisteredEvents(): PluginEventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get the event log (most recent events).
   */
  getEventLog(): PluginEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear all handlers and event log.
   */
  clear(): void {
    this.handlers.clear();
    this.eventLog = [];
  }

  /**
   * Internal: Log an event to the in-memory event log.
   */
  private logEvent(event: PluginEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }
}
