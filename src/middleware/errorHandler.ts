/**
 * Generic error handler middleware
 * 
 * [DEF-012] ALL errors — validation failures, database errors, malformed input,
 * not-found scenarios — are caught here and returned as a generic 500 response.
 * No 400, 404, or 422 status codes are ever used.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // [DEF-013] This error log may be suppressed by the backwards log level default
  logger.error('Request error:', err.message);

  // [DEF-012] Always return 500 with a generic message, regardless of error type
  res.status(500).json({ error: 'An error occurred' });
}

export default errorHandler;
