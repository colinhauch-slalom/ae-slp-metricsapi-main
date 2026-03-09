/**
 * PluginEventBus unit tests
 */

import { PluginEventBus } from '../../src/plugins/PluginEventBus.js';

describe('PluginEventBus', () => {
  let eventBus: PluginEventBus;

  beforeEach(() => {
    eventBus = new PluginEventBus();
  });

  it('should register event handlers', () => {
    const handler = jest.fn();
    eventBus.on('request:start', handler);
    expect(eventBus.getHandlerCount('request:start')).toBe(1);
  });

  it('should emit events to registered handlers', async () => {
    const handler = jest.fn();
    eventBus.on('request:start', handler);

    await eventBus.emit('request:start', { method: 'GET', path: '/' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request:start',
        data: { method: 'GET', path: '/' },
      }),
    );
  });

  it('should remove event handlers', () => {
    const handler = jest.fn();
    eventBus.on('request:start', handler);
    eventBus.off('request:start', handler);
    expect(eventBus.getHandlerCount('request:start')).toBe(0);
  });

  it('should log events in event log', async () => {
    await eventBus.emit('metric:ingest', { name: 'test' });
    const log = eventBus.getEventLog();
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('metric:ingest');
  });

  it('should clear all handlers and log', () => {
    eventBus.on('request:start', jest.fn());
    eventBus.clear();
    expect(eventBus.getHandlerCount('request:start')).toBe(0);
    expect(eventBus.getEventLog()).toHaveLength(0);
  });
});
