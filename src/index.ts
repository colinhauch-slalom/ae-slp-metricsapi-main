/**
 * Express application bootstrap
 * 
 * Initializes:
 *   - Express app with JSON body parsing
 *   - Config chain (ConfigProvider → ConfigResolver → ConfigValidator) [DEF-007]
 *   - PostgreSQL connection pool via pg
 *   - Redis connection via ioredis
 *   - v1 routes
 *   - Error handler middleware [DEF-012]
 *   - Logger [DEF-013]
 */

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { ConfigProvider, RawConfig } from './config/ConfigProvider.js';
import { ConfigResolver } from './config/ConfigResolver.js';
import { ConfigValidator } from './config/ConfigValidator.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import v1Router from './routes/v1.js';
import { PluginEventBus } from './plugins/PluginEventBus.js';
import { PluginRegistry } from './plugins/PluginRegistry.js';
import { PluginLifecycleManager } from './plugins/PluginLifecycleManager.js';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';

// ---- Types ----
interface AppConfig {
  server: { port: number; host: string };
  db: { host: string; port: number; name: string; password: string; user: string };
  redis: { host: string; port: number };
  [key: string]: unknown;
}

// ---- Module-level state (initialized in start()) ----
export let pool: Pool;
export let redis: InstanceType<typeof Redis>;
export let configResolver: ConfigResolver;
export let appConfig: AppConfig;

// ---- Plugin System [DEF-005] ----
// Fully-featured plugin infrastructure with zero plugins registered
export const pluginEventBus = new PluginEventBus();
export const pluginRegistry = new PluginRegistry();
export const pluginLifecycleManager = new PluginLifecycleManager(pluginRegistry, pluginEventBus);

// ---- Express App ----
const app = express();

app.use(express.json());

// [DEF-005] Plugin middleware — fires events on every request to zero listeners
app.use((req, res, next) => {
  pluginEventBus.emit('request:start', {
    method: req.method,
    path: req.path,
    timestamp: new Date(),
  }, 'express-middleware');

  // Fire request:end when response finishes
  res.on('finish', () => {
    pluginEventBus.emit('request:end', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      timestamp: new Date(),
    }, 'express-middleware');
  });

  next();
});

// Mount v1 routes
app.use('/', v1Router);

// [DEF-008] Serve stale Swagger UI at /api-docs
// The swagger.json references wrong routes (POST /metrics/ingest) and
// nonexistent parameters (granularity, fill)
try {
  const swaggerPath = path.resolve(__dirname, '..', 'docs', 'swagger.json');
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  logger.warn('Failed to load swagger.json, /api-docs will be unavailable');
}

// Error handler MUST be registered AFTER routes [DEF-012]
app.use(errorHandler);

// ---- Start Server ----
async function start(): Promise<void> {
  try {
    // ---- Config Chain [DEF-007] ----
    const configProvider = new ConfigProvider();
    configProvider.addSource('env');

    const rawConfig = await configProvider.load();
    configResolver = new ConfigResolver(rawConfig);

    const configValidator = new ConfigValidator();
    const { config: validatedConfig } = configValidator.validateAndApplyDefaults(rawConfig);

    // Cast to typed config — defaults are applied by validator
    appConfig = validatedConfig as unknown as AppConfig;

    // ---- Database Pool ----
    pool = new Pool({
      host: appConfig.db.host,
      port: appConfig.db.port,
      database: appConfig.db.name,
      password: appConfig.db.password,
      user: appConfig.db.user || 'postgres',
      max: 10,
    });

    // ---- Redis ----
    redis = new Redis({
      host: appConfig.redis.host,
      port: appConfig.redis.port,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    // Attempt Redis connection (non-blocking — app starts even if Redis fails)
    redis.connect().catch((err) => {
      logger.warn('Redis connection failed, cache will be unavailable:', err.message);
    });

    const PORT = appConfig.server.port;
    const HOST = appConfig.server.host;

    // ---- Initialize Plugin System [DEF-005] ----
    // Does nothing because zero plugins are registered, but runs the full lifecycle
    await pluginLifecycleManager.initializeAll();
    await pluginLifecycleManager.startAll();
    logger.info(`Plugin system initialized: ${pluginRegistry.count()} plugins loaded`);

    app.listen(PORT, HOST, () => {
      logger.info(`MetricsAPI listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', (err as Error).message);
    process.exit(1);
  }
}

start();

export default app;
