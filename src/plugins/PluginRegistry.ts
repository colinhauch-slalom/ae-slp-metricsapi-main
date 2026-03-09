/**
 * PluginRegistry — Plugin registration and lookup
 * 
 * [DEF-005] Part of the fully-featured but completely UNUSED plugin system.
 * Supports registration, lookup, listing, enable/disable — with zero plugins
 * ever registered. Full CRUD for an empty collection.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import logger from '../utils/logger.js';

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  entryPoint: string;
  dependencies?: string[];
  config?: Record<string, unknown>;
}

export interface PluginInstance {
  descriptor: PluginDescriptor;
  instance: unknown;
  status: 'registered' | 'initialized' | 'started' | 'stopped' | 'error';
  error?: Error;
}

export class PluginRegistry {
  private plugins: Map<string, PluginInstance>;

  constructor() {
    this.plugins = new Map();
  }

  /**
   * Register a plugin descriptor.
   * [DEF-005] Nobody calls this.
   */
  register(descriptor: PluginDescriptor): void {
    logger.debug(`PluginRegistry: Registering plugin '${descriptor.id}'`);

    if (this.plugins.has(descriptor.id)) {
      throw new PluginRegistryError(`Plugin '${descriptor.id}' is already registered`);
    }

    this.plugins.set(descriptor.id, {
      descriptor,
      instance: null,
      status: 'registered',
    });

    logger.info(`PluginRegistry: Plugin '${descriptor.name}' v${descriptor.version} registered`);
  }

  /**
   * Unregister a plugin by ID.
   */
  unregister(pluginId: string): void {
    logger.debug(`PluginRegistry: Unregistering plugin '${pluginId}'`);

    if (!this.plugins.has(pluginId)) {
      throw new PluginRegistryError(`Plugin '${pluginId}' is not registered`);
    }

    this.plugins.delete(pluginId);
    logger.info(`PluginRegistry: Plugin '${pluginId}' unregistered`);
  }

  /**
   * Get a plugin by ID.
   */
  get(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins.
   * [DEF-005] Always returns an empty array.
   */
  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get only enabled plugins.
   */
  getEnabled(): PluginInstance[] {
    return this.getAll().filter((p) => p.descriptor.enabled);
  }

  /**
   * Enable a plugin.
   */
  enable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginRegistryError(`Plugin '${pluginId}' is not registered`);
    }
    plugin.descriptor.enabled = true;
    logger.info(`PluginRegistry: Plugin '${pluginId}' enabled`);
  }

  /**
   * Disable a plugin.
   */
  disable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginRegistryError(`Plugin '${pluginId}' is not registered`);
    }
    plugin.descriptor.enabled = false;
    logger.info(`PluginRegistry: Plugin '${pluginId}' disabled`);
  }

  /**
   * Update a plugin's status.
   */
  updateStatus(pluginId: string, status: PluginInstance['status'], error?: Error): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginRegistryError(`Plugin '${pluginId}' is not registered`);
    }
    plugin.status = status;
    if (error) plugin.error = error;
  }

  /**
   * Check if a plugin is registered.
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get the count of registered plugins.
   * [DEF-005] Always returns 0.
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Clear all registered plugins.
   */
  clear(): void {
    this.plugins.clear();
    logger.info('PluginRegistry: All plugins cleared');
  }
}

/**
 * Custom error for plugin registry operations.
 */
export class PluginRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginRegistryError';
  }
}
