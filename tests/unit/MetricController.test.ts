/**
 * MetricController unit tests
 * 
 * These tests actually work correctly — they test the controller's
 * request handling and response formatting.
 */

import { Request, Response, NextFunction } from 'express';
import { MetricController } from '../../src/controllers/MetricController';
import { MetricService } from '../../src/services/MetricService';

// Mock MetricService
jest.mock('../../src/services/MetricService');

describe('MetricController', () => {
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

    mockReq = {
      body: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('ingest', () => {
    it('should return 201 with the persisted data point', async () => {
      const dataPoint = {
        id: 'test-uuid-1234',
        metric_name: 'cpu.usage',
        value: 72.5,
        timestamp: new Date('2026-03-04T12:00:00Z'),
        created_at: new Date('2026-03-04T12:00:01Z'),
      };

      mockService.ingest.mockResolvedValue(dataPoint);

      mockReq.body = {
        name: 'cpu.usage',
        value: 72.5,
        timestamp: '2026-03-04T12:00:00Z',
      };

      await controller.ingest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 'test-uuid-1234',
        name: 'cpu.usage',
        value: 72.5,
        timestamp: dataPoint.timestamp,
        created_at: dataPoint.created_at,
      });
    });

    it('should call next with error when service throws', async () => {
      mockService.ingest.mockRejectedValue(new Error('Database error'));

      mockReq.body = {
        name: 'cpu.usage',
        value: 72.5,
        timestamp: '2026-03-04T12:00:00Z',
      };

      await controller.ingest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('query', () => {
    it('should return 200 with aggregation result', async () => {
      const dataPoints = [
        { id: '1', metric_name: 'cpu.usage', value: 50, timestamp: new Date(), created_at: new Date() },
        { id: '2', metric_name: 'cpu.usage', value: 70, timestamp: new Date(), created_at: new Date() },
        { id: '3', metric_name: 'cpu.usage', value: 90, timestamp: new Date(), created_at: new Date() },
      ];

      mockService.queryByTimeRange.mockResolvedValue(dataPoints);

      mockReq.query = {
        name: 'cpu.usage',
        start: '2026-03-01T00:00:00Z',
        end: '2026-03-04T23:59:59Z',
        aggregation: 'average',
      };

      await controller.query(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cpu.usage',
          aggregation: 'average',
          value: 70,
          count: 3,
        }),
      );
    });

    it('should call next with error when query parameters are missing', async () => {
      mockReq.query = {};

      await controller.query(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
