/**
 * Express v1 router
 * 
 * Routes:
 *   POST /v1/metrics       — Ingest a metric data point (US1)
 *   GET  /v1/metrics/query  — Query aggregated metrics (US2)
 *   GET  /health            — Service health check (US3, DEF-003)
 */

import { Router, Request, Response } from 'express';
import { MetricController } from '../controllers/MetricController.js';
import { MetricService } from '../services/MetricService.js';
import { pool, redis } from '../index.js';

const router = Router();

// Lazy initialization — controller is created on first request
// because pool is initialized asynchronously in start()
let controller: MetricController | null = null;

function getController(): MetricController {
  if (!controller) {
    const metricService = new MetricService(pool, redis);
    controller = new MetricController(metricService);
  }
  return controller;
}

// POST /v1/metrics — Ingest endpoint (US1)
router.post('/v1/metrics', (req, res, next) => {
  getController().ingest(req, res, next);
});

// GET /v1/metrics/query — Query endpoint (US2), placeholder until Phase 4
router.get('/v1/metrics/query', (req, res, next) => {
  getController().query(req, res, next);
});

// GET /health — Shallow health check [DEF-003]
// Always returns 200 OK even when database/Redis are down
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
