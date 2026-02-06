/**
 * Sliding Window Rate Limiter
 * Industry-standard implementation using sliding window algorithm
 * Tracks requests per identifier (IP, userId, etc.) within a time window
 */

export interface RateLimiterConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Identifier for the rate limiter (for logging) */
  name?: string;
  /** Whether to skip failed requests */
  skipFailedRequests?: boolean;
  /** Whether to skip successful requests */
  skipSuccessfulRequests?: boolean;
  /** Custom key generator function */
  keyGenerator?: (context: RateLimiterContext) => string;
}

export interface RateLimiterContext {
  req?: any;
  identifier?: string;
  [key: string]: any;
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimiterStore {
  requests: number;
  resetTime: number;
  blocked?: boolean;
  blockedUntil?: number;
}

/**
 * Sliding window rate limiter implementation
 * Uses in-memory storage by default
 */
export class RateLimiter {
  private config: Required<RateLimiterConfig>;
  private store: Map<string, RateLimiterStore> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig) {
    this.config = {
      name: config.name || 'RateLimiter',
      skipFailedRequests: config.skipFailedRequests ?? false,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      keyGenerator: config.keyGenerator || ((ctx) => ctx.identifier || 'default'),
      ...config,
    };

    // Start cleanup interval to prevent memory leaks
    this.startCleanup();
  }

  /**
   * Check if a request is allowed
   * Implements sliding window algorithm
   */
  public checkLimit(context: RateLimiterContext): RateLimitResult {
    const key = this.config.keyGenerator(context);
    const now = Date.now();

    let data = this.store.get(key);

    // Initialize new entry if doesn't exist
    if (!data) {
      data = {
        requests: 0,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, data);
    }

    // Check if window has expired
    if (now >= data.resetTime) {
      // Reset window
      data.requests = 1;
      data.resetTime = now + this.config.windowMs;
      data.blocked = false;
      data.blockedUntil = undefined;
    } else {
      // Still in current window - increment counter
      data.requests++;
    }

    const remaining = Math.max(0, this.config.maxRequests - data.requests);
    const resetTime = data.resetTime;
    const isAllowed = data.requests <= this.config.maxRequests;

    const result: RateLimitResult = {
      isAllowed,
      remaining,
      resetTime,
    };

    if (!isAllowed) {
      result.retryAfter = Math.ceil((resetTime - now) / 1000);
      this.logRateLimitViolation(key, data.requests);
    }

    return result;
  }

  /**
   * Reset rate limit for a specific identifier
   */
  public reset(identifier: string): void {
    this.store.delete(identifier);
    console.log(`[${this.config.name}] Rate limit reset for: ${identifier}`);
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.store.clear();
    console.log(`[${this.config.name}] All rate limits reset`);
  }

  /**
   * Get current status for an identifier
   */
  public getStatus(identifier: string) {
    const data = this.store.get(identifier);
    if (!data) {
      return {
        requests: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        isActive: false,
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - data.requests);
    return {
      requests: data.requests,
      remaining,
      resetTime: data.resetTime,
      isActive: true,
    };
  }

  /**
   * Start cleanup interval to remove expired entries
   * Prevents memory leaks in long-running processes
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Don't keep process alive for this interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove expired entries from store
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, data] of this.store.entries()) {
      // Remove if current time is beyond reset time + 1 additional window
      if (now > data.resetTime + this.config.windowMs) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(
        `[${this.config.name}] Cleanup: Removed ${removed} expired entries. Current size: ${this.store.size}`
      );
    }
  }

  /**
   * Stop the cleanup interval
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
    console.log(`[${this.config.name}] Rate limiter destroyed`);
  }

  /**
   * Log rate limit violations
   */
  private logRateLimitViolation(identifier: string, requestCount: number): void {
    console.warn(
      `[${this.config.name}] Rate limit exceeded for ${identifier}: ${requestCount}/${this.config.maxRequests} requests`
    );
  }

  /**
   * Get store statistics
   */
  public getStats() {
    return {
      activeIdentifiers: this.store.size,
      config: this.config,
      totalRequests: Array.from(this.store.values()).reduce(
        (sum, data) => sum + data.requests,
        0
      ),
    };
  }
}

/**
 * Factory function for creating rate limiters with common presets
 */
export class RateLimiterPresets {
  /**
   * Strict rate limiter - for sensitive operations
   */
  static strict(): RateLimiter {
    return new RateLimiter({
      name: 'Strict',
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });
  }

  /**
   * Standard rate limiter - for general API endpoints
   */
  static standard(): RateLimiter {
    return new RateLimiter({
      name: 'Standard',
      maxRequests: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });
  }

  /**
   * Relaxed rate limiter - for non-critical endpoints
   */
  static relaxed(): RateLimiter {
    return new RateLimiter({
      name: 'Relaxed',
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Telegram command limiter - prevents command spam
   */
  static telegramCommand(): RateLimiter {
    return new RateLimiter({
      name: 'TelegramCommand',
      maxRequests: 5,
      windowMs: 5 * 1000, // 5 seconds
    });
  }

  /**
   * Telegram frequency limiter - prevents constant frequency changes
   */
  static telegramFrequency(): RateLimiter {
    return new RateLimiter({
      name: 'TelegramFrequency',
      maxRequests: 3,
      windowMs: 60 * 1000, // 1 minute
    });
  }
}

export default RateLimiter;
