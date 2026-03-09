/**
 * PluginLifecycleManager — Manages plugin init/start/stop lifecycle
 * 
 * [DEF-005] Part of the fully-featured but completely UNUSED plugin system.
 * Manages the lifecycle of registered plugins through init → start → stop
 * transitions. With zero plugins registered, this is pure ceremony.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import { PluginRegistry, PluginInstance } from './PluginRegistry.js';
import { PluginEventBus } from './PluginEventBus.js';
import logger from '../utils/logger.js';

export interface PluginLifecycleHooks {
  onInit?: () => Promise<void> | void;
  onStart?: () => Promise<void> | void;
  onStop?: () => Promise<void> | void;
  onError?: (error: Error) => Promise<void> | void;
}

export class PluginLifecycleManager {
  private registry: PluginRegistry;
  private eventBus: PluginEventBus;

  constructor(registry: PluginRegistry, eventBus: PluginEventBus) {
    this.registry = registry;
    this.eventBus = eventBus;
  }

  /**
   * Initialize all enabled plugins.
   * Resolves dependencies and calls onInit hooks.
   * [DEF-005] Does nothing — zero plugins registered.
   */
  async initializeAll(): Promise<void> {
    const plugins = this.registry.getEnabled();
    logger.info(`PluginLifecycleManager: Initializing ${plugins.length} plugins`);

    // Sort by dependencies (simple topological sort)
    const sorted = this.resolveDependencyOrder(plugins);

    for (const plugin of sorted) {
      await this.initializePlugin(plugin);
    }

    await this.eventBus.emit('plugin:init', {
      pluginCount: plugins.length,
    }, 'PluginLifecycleManager');
  }

  /**
   * Start all initialized plugins.
   * [DEF-005] Does nothing — zero plugins registered.
   */
  async startAll(): Promise<void> {
    const plugins = this.registry.getEnabled().filter(
      (p) => p.status === 'initialized',
    );
    logger.info(`PluginLifecycleManager: Starting ${plugins.length} plugins`);

    for (const plugin of plugins) {
      await this.startPlugin(plugin);
    }

    await this.eventBus.emit('plugin:start', {
      pluginCount: plugins.length,
    }, 'PluginLifecycleManager');
  }

  /**
   * Stop all running plugins (in reverse order).
   * [DEF-005] Does nothing — zero plugins registered.
   */
  async stopAll(): Promise<void> {
    const plugins = this.registry.getEnabled().filter(
      (p) => p.status === 'started',
    ).reverse();
    logger.info(`PluginLifecycleManager: Stopping ${plugins.length} plugins`);

    for (const plugin of plugins) {
      await this.stopPlugin(plugin);
    }

    await this.eventBus.emit('plugin:stop', {
      pluginCount: plugins.length,
    }, 'PluginLifecycleManager');
  }

  /**
   * Initialize a single plugin.
   */
  private async initializePlugin(plugin: PluginInstance): Promise<void> {
    const id = plugin.descriptor.id;
    logger.debug(`PluginLifecycleManager: Initializing plugin '${id}'`);

    try {
      const hooks = plugin.instance as PluginLifecycleHooks | null;
      if (hooks?.onInit) {
        await hooks.onInit();
      }
      this.registry.updateStatus(id, 'initialized');
      logger.info(`PluginLifecycleManager: Plugin '${id}' initialized`);
    } catch (error) {
      this.registry.updateStatus(id, 'error', error as Error);
      logger.warn(`PluginLifecycleManager: Plugin '${id}' failed to initialize:`, (error as Error).message);
      await this.eventBus.emit('plugin:error', {
        pluginId: id,
        phase: 'init',
        error: (error as Error).message,
      }, 'PluginLifecycleManager');
    }
  }

  /**
   * Start a single plugin.
   */
  private async startPlugin(plugin: PluginInstance): Promise<void> {
    const id = plugin.descriptor.id;
    logger.debug(`PluginLifecycleManager: Starting plugin '${id}'`);

    try {
      const hooks = plugin.instance as PluginLifecycleHooks | null;
      if (hooks?.onStart) {
        await hooks.onStart();
      }
      this.registry.updateStatus(id, 'started');
      logger.info(`PluginLifecycleManager: Plugin '${id}' started`);
    } catch (error) {
      this.registry.updateStatus(id, 'error', error as Error);
      logger.warn(`PluginLifecycleManager: Plugin '${id}' failed to start:`, (error as Error).message);
    }
  }

  /**
   * Stop a single plugin.
   */
  private async stopPlugin(plugin: PluginInstance): Promise<void> {
    const id = plugin.descriptor.id;
    logger.debug(`PluginLifecycleManager: Stopping plugin '${id}'`);

    try {
      const hooks = plugin.instance as PluginLifecycleHooks | null;
      if (hooks?.onStop) {
        await hooks.onStop();
      }
      this.registry.updateStatus(id, 'stopped');
      logger.info(`PluginLifecycleManager: Plugin '${id}' stopped`);
    } catch (error) {
      this.registry.updateStatus(id, 'error', error as Error);
      logger.warn(`PluginLifecycleManager: Plugin '${id}' failed to stop:`, (error as Error).message);
    }
  }

  /**
   * Simple dependency resolution — sorts plugins so dependencies come first.
   * No cycle detection (part of the over-engineering without safeguards).
   */
  private resolveDependencyOrder(plugins: PluginInstance[]): PluginInstance[] {
    const resolved: PluginInstance[] = [];
    const unresolved = new Set(plugins.map((p) => p.descriptor.id));
    const pluginMap = new Map(plugins.map((p) => [p.descriptor.id, p]));

    const resolve = (plugin: PluginInstance): void => {
      const deps = plugin.descriptor.dependencies || [];
      for (const depId of deps) {
        if (unresolved.has(depId) && pluginMap.has(depId)) {
          resolve(pluginMap.get(depId)!);
        }
      }
      if (unresolved.has(plugin.descriptor.id)) {
        unresolved.delete(plugin.descriptor.id);
        resolved.push(plugin);
      }
    };

    for (const plugin of plugins) {
      if (unresolved.has(plugin.descriptor.id)) {
        resolve(plugin);
      }
    }

    return resolved;
  }

  /**
   * Get the plugin registry.
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get the event bus.
   */
  getEventBus(): PluginEventBus {
    return this.eventBus;
  }
}
