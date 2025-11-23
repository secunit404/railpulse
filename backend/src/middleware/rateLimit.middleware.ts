import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

const rateLimitMap = new Map<number, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

setInterval(() => {
  const now = new Date();
  for (const [userId, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(userId);
    }
  }
}, 5 * 60 * 1000);

export function rateLimitMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  const now = new Date();

  let entry = rateLimitMap.get(userId);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    entry = {
      count: 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW),
    };
    rateLimitMap.set(userId, entry);
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    const resetIn = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
    logger.warn(`Rate limit exceeded for user ${userId}`);
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
      retryAfter: resetIn,
    });
    return;
  }

  entry.count++;
  next();
}
