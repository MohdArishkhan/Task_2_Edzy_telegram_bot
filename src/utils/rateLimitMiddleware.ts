import { Request, Response, NextFunction } from 'express';
import { RateLimiter, RateLimiterConfig } from './RateLimiter';

/**
 * Express middleware for rate limiting
 * Adds rate limit headers and returns 429 on limit exceeded
 */
export function createRateLimitMiddleware(config: RateLimiterConfig) {
  const limiter = new RateLimiter(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate identifier from IP or custom header
    const identifier =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown';

    // Check rate limit
    const result = limiter.checkLimit({
      req,
      identifier: String(identifier),
    });

    // Set rate limit headers
    res.set({
      'RateLimit-Limit': String(config.maxRequests),
      'RateLimit-Remaining': String(result.remaining),
      'RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    });

    if (!result.isAllowed && result.retryAfter) {
      res.set('Retry-After', String(result.retryAfter));
    }

    if (!result.isAllowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Create a user-scoped rate limit middleware
 * Uses userId from request context instead of IP
 */
export function createUserRateLimitMiddleware(config: RateLimiterConfig) {
  const limiter = new RateLimiter({
    ...config,
    keyGenerator: (ctx) => {
      // Try to get userId from various sources
      const req = ctx.req as any;
      const userId =
        req?.user?.id ||
        req?.params?.userId ||
        req?.query?.userId ||
        req?.headers['x-user-id'] ||
        'anonymous';
      return String(userId);
    },
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.checkLimit({ req });

    // Set rate limit headers
    res.set({
      'RateLimit-Limit': String(config.maxRequests),
      'RateLimit-Remaining': String(result.remaining),
      'RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    });

    if (!result.isAllowed && result.retryAfter) {
      res.set('Retry-After', String(result.retryAfter));
    }

    if (!result.isAllowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      });
      return;
    }

    next();
  };
}
