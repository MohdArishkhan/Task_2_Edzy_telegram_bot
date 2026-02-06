/**
 * Rate Limiter Utilities Index
 * Central export point for all rate limiting utilities
 * 
 * Usage:
 * import { RateLimiter, rateLimiterManager } from './utils/index';
 */

export {
  RateLimiter,
  RateLimiterPresets,
  RateLimiterManager,
  rateLimiterManager,
} from './RateLimiter';

export type {
  RateLimiterConfig,
  RateLimiterContext,
  RateLimitResult,
  RateLimiterStore,
} from './RateLimiter';

export {
  createRateLimitMiddleware,
  createUserRateLimitMiddleware,
} from './rateLimitMiddleware';

export { RateLimiterManager } from './RateLimiterManager';

export { default as RateLimitConfig } from '../config/rateLimitConfig';

// Re-export manager for convenience
export { rateLimiterManager } from './RateLimiterManager';
