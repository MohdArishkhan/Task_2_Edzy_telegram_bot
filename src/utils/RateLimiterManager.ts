/**
 * Rate Limiter Manager
 * Manages all rate limiters in the application
 * Provides centralized initialization, cleanup, and monitoring
 */

import { RateLimiter, RateLimiterConfig } from './RateLimiter';
import RateLimitConfig from '../config/rateLimitConfig';

export class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map();
  private static instance: RateLimiterManager;

  /**
   * Get singleton instance
   */
  static getInstance(): RateLimiterManager {
    if (!RateLimiterManager.instance) {
      RateLimiterManager.instance = new RateLimiterManager();
    }
    return RateLimiterManager.instance;
  }

  /**
   * Initialize all rate limiters
   */
  public initializeAll(): void {
    console.log('[RateLimiterManager] Initializing rate limiters...');

    // API limiters
    this.register('api:health', RateLimitConfig.api.health);
    this.register('api:status', RateLimitConfig.api.status);

    // Telegram command limiters
    this.register('telegram:command', RateLimitConfig.telegram.command);
    this.register('telegram:start', RateLimitConfig.telegram.start);
    this.register('telegram:enable', RateLimitConfig.telegram.enable);
    this.register('telegram:disable', RateLimitConfig.telegram.disable);
    this.register('telegram:frequency', RateLimitConfig.telegram.frequency);
    this.register('telegram:status', RateLimitConfig.telegram.status);
    this.register('telegram:help', RateLimitConfig.telegram.help);
    this.register('telegram:test', RateLimitConfig.telegram.test);

    // Database limiters
    this.register('db:user-creation', RateLimitConfig.database.userCreation);
    this.register('db:user-update', RateLimitConfig.database.userUpdate);

    // Scheduler limiters
    this.register('scheduler:creation', RateLimitConfig.scheduler.scheduleCreation);

    console.log(
      `[RateLimiterManager] Initialized ${this.limiters.size} rate limiters`
    );
  }

  /**
   * Register a new rate limiter
   */
  public register(name: string, config: RateLimiterConfig): RateLimiter {
    const limiter = new RateLimiter(config);
    this.limiters.set(name, limiter);
    console.log(`[RateLimiterManager] Registered rate limiter: ${name}`);
    return limiter;
  }

  /**
   * Get a specific rate limiter by name
   */
  public get(name: string): RateLimiter {
    const limiter = this.limiters.get(name);
    if (!limiter) {
      throw new Error(`Rate limiter '${name}' not found`);
    }
    return limiter;
  }

  /**
   * Check if a specific rate limiter exists
   */
  public has(name: string): boolean {
    return this.limiters.has(name);
  }

  /**
   * Get all registered limiters
   */
  public getAll(): Map<string, RateLimiter> {
    return new Map(this.limiters);
  }

  /**
   * Cleanup all rate limiters
   */
  public cleanupAll(): void {
    console.log('[RateLimiterManager] Cleaning up all rate limiters...');
    for (const limiter of this.limiters.values()) {
      limiter.destroy();
    }
    this.limiters.clear();
    console.log('[RateLimiterManager] All rate limiters destroyed');
  }

  /**
   * Get statistics for all limiters
   */
  public getAllStats() {
    const stats: Record<string, any> = {};

    for (const [name, limiter] of this.limiters.entries()) {
      stats[name] = limiter.getStats();
    }

    return stats;
  }

  /**
   * Reset a specific rate limiter
   */
  public reset(name: string, identifier?: string): void {
    const limiter = this.get(name);
    if (identifier) {
      limiter.reset(identifier);
    } else {
      limiter.resetAll();
    }
  }

  /**
   * Get health status of all limiters
   */
  public getHealth() {
    return {
      status: 'healthy',
      totalLimiters: this.limiters.size,
      limiters: Array.from(this.limiters.keys()).map((name) => ({
        name,
        stats: this.get(name).getStats(),
      })),
    };
  }
}

// Export singleton instance
export const rateLimiterManager = RateLimiterManager.getInstance();

export default RateLimiterManager;
