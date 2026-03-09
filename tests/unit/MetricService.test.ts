/**
 * MetricService unit tests
 * 
 * [DEF-016] INTENTIONAL ISSUE: These tests mock the layer ABOVE (MetricController)
 * instead of testing the MetricService logic. They verify HTTP responses rather
 * than service behavior, making them useless as service-level tests.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import { Request, Response, NextFunction } from 'express';

// [DEF-016] We're importing and testing the CONTROLLER, not the service
// The test file is named MetricService.test.ts but tests MetricController behavior
import { MetricController } from '../../src/controllers/MetricController';
import { MetricService } from '../../src/services/MetricService';

jest.mock('../../src/services/MetricService');

describe('MetricService', () => {
  // [DEF-016] These are controller-level mocks, not service-level
  let controller: MetricController;
  let mockService: jest.Mocked<MetricService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = {
      ingest: jest.fn(),
      queryByTimeRange: jest.fn(),
    } as unknown as jest.Mocked<MetricService>;

    controller = new MetricController(mockService);

    mockReq = { body: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  // [DEF-016] Test says "should process metric through pipeline" but actually
  // tests the controller's HTTP response formatting
  it('should process metric through ingestion pipeline', async () => {
    const dataPoint = {
      id: 'uuid-123',
      metric_name: 'test.metric',
      value: 42,
      timestamp: new Date(),
      created_at: new Date(),
    };

    mockService.ingest.mockResolvedValue(dataPoint);
    mockReq.body = { name: 'test.metric', value: 42, timestamp: '2026-01-01T00:00:00Z' };

    await controller.ingest(mockReq as Request, mockRes as Response, mockNext);

    // [DEF-016] Checking HTTP status instead of service behavior
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  // [DEF-016] Says "should validate input" but doesn't test validation at all
  it('should validate metric input before processing', async () => {
    mockService.ingest.mockRejectedValue(new Error('Validation failed'));
    mockReq.body = { invalid: 'data' };

    await controller.ingest(mockReq as Request, mockRes as Response, mockNext);

    // [DEF-016] Just checks that next() was called with an error — says nothing
    // about the validation logic in MetricService
    expect(mockNext).toHaveBeenCalled();
  });

  // [DEF-016] says "should query metrics" but tests the controller response format
  it('should query metrics with aggregation', async () => {
    mockService.queryByTimeRange.mockResolvedValue([
      { id: '1', metric_name: 'cpu', value: 10, timestamp: new Date(), created_at: new Date() },
      { id: '2', metric_name: 'cpu', value: 20, timestamp: new Date(), created_at: new Date() },
    ]);

    mockReq.query = {
      name: 'cpu',
      start: '2026-01-01T00:00:00Z',
      end: '2026-12-31T23:59:59Z',
      aggregation: 'sum',
    };

    await controller.query(mockReq as Request, mockRes as Response, mockNext);

    // [DEF-016] Checking HTTP response, not service query logic
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
