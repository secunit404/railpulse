import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof Error) {
    logger.error(`Error: ${error.message}`, { stack: error.stack, path: req.path });
  } else {
    logger.error('Unknown error', { path: req.path, error });
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflict',
        message: 'A record with this unique field already exists',
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({
        error: 'Not found',
        message: 'Record not found',
      });
      return;
    }

    res.status(400).json({
      error: 'Database error',
      message: error.message,
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
}
