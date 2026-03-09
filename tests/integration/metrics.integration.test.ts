/**
 * Metrics integration tests
 * 
 * [DEF-015] INTENTIONAL ISSUE: Half of the tests are skipped.
 * Only 3 out of 6 tests actually execute.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import { Pool } from 'pg';
import express from 'express';
import request from 'supertest';

// Note: These tests require a running PostgreSQL instance.
// In the broken state, some are skipped and the setup may not work correctly.

describe('Metrics API Integration', () => {
  let app: express.Application;
  let pool: Pool | undefined;

  beforeAll(async () => {
    // Setup would normally initialize a test database
    // For the learning series, this setup is incomplete
    app = express();
    app.use(express.json());

    // Mock health endpoint
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Mock ingest endpoint
    app.post('/v1/metrics', (_req, res) => {
      res.status(201).json({
        id: 'test-uuid',
        name: _req.body.name,
        value: _req.body.value,
        timestamp: _req.body.timestamp,
        created_at: new Date().toISOString(),
      });
    });

    // Mock query endpoint
    app.get('/v1/metrics/query', (_req, res) => {
      res.status(200).json({
        name: _req.query.name,
        start: _req.query.start,
        end: _req.query.end,
        aggregation: _req.query.aggregation,
        value: 42,
        count: 10,
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    if (pool) {
      await pool.end();
    }
  });

  it('should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should ingest a metric data point', async () => {
    const response = await request(app)
      .post('/v1/metrics')
      .send({
        name: 'cpu.usage',
        value: 72.5,
        timestamp: '2026-03-04T12:00:00Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('cpu.usage');
    expect(response.body.value).toBe(72.5);
  });

  // [DEF-015] Skipped
  it.skip('should reject invalid metric data', async () => {
    const response = await request(app)
      .post('/v1/metrics')
      .send({ invalid: 'data' });

    expect(response.status).toBe(500);
  });

  it('should query metrics with aggregation', async () => {
    const response = await request(app)
      .get('/v1/metrics/query')
      .query({
        name: 'cpu.usage',
        start: '2026-03-01T00:00:00Z',
        end: '2026-03-04T23:59:59Z',
        aggregation: 'average',
      });

    expect(response.status).toBe(200);
    expect(response.body.aggregation).toBe('average');
  });

  // [DEF-015] Skipped
  it.skip('should return empty result for unknown metric', async () => {
    const response = await request(app)
      .get('/v1/metrics/query')
      .query({
        name: 'nonexistent.metric',
        start: '2026-03-01T00:00:00Z',
        end: '2026-03-04T23:59:59Z',
        aggregation: 'sum',
      });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(0);
    expect(response.body.value).toBe(0);
  });

  // [DEF-015] Skipped
  it.skip('should handle concurrent ingestion requests', async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      request(app)
        .post('/v1/metrics')
        .send({
          name: 'load.test',
          value: i,
          timestamp: new Date().toISOString(),
        }),
    );

    const results = await Promise.all(promises);
    results.forEach((r) => expect(r.status).toBe(201));
  });
});
