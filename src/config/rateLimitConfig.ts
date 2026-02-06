/**
 * Rate Limiter Configuration
 * Centralized configuration for all rate limiting across the application
 */

export const RateLimitConfig = {
  // API Endpoints
  api: {
    // Health check endpoint - very strict to detect abuse
    health: {
      maxRequests: 30,
      windowMs: 60 * 1000, // 30 requests per minute
      name: 'HealthCheck',
    },
    // Status endpoint - strict
    status: {
      maxRequests: 20,
      windowMs: 60 * 1000, // 20 requests per minute
      name: 'StatusCheck',
    },
  },

  // Telegram Bot Commands
  telegram: {
    // General command limiter - prevents rapid command spam
    command: {
      maxRequests: 5,
      windowMs: 5 * 1000, // 5 requests per 5 seconds
      name: 'TelegramCommand',
    },
    // /start command - limit per user
    start: {
      maxRequests: 3,
      windowMs: 60 * 1000, // 3 times per minute
      name: 'TelegramStart',
    },
    // /enable command - limit per user
    enable: {
      maxRequests: 5,
      windowMs: 60 * 1000, // 5 times per minute
      name: 'TelegramEnable',
    },
    // /disable command - limit per user
    disable: {
      maxRequests: 5,
      windowMs: 60 * 1000, // 5 times per minute
      name: 'TelegramDisable',
    },
    // /frequency command - most restricted (prevents abuse of settings)
    frequency: {
      maxRequests: 3,
      windowMs: 60 * 1000, // 3 times per minute
      name: 'TelegramFrequency',
    },
    // /status command - moderate
    status: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 10 times per minute
      name: 'TelegramStatus',
    },
    // /help command - relaxed
    help: {
      maxRequests: 20,
      windowMs: 60 * 1000, // 20 times per minute
      name: 'TelegramHelp',
    },
    // /test command - relaxed (development only)
    test: {
      maxRequests: 20,
      windowMs: 60 * 1000, // 20 times per minute
      name: 'TelegramTest',
    },
  },

  // Database Operations
  database: {
    // User creation rate limit
    userCreation: {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 100 per hour
      name: 'UserCreation',
    },
    // User updates
    userUpdate: {
      maxRequests: 500,
      windowMs: 60 * 60 * 1000, // 500 per hour
      name: 'UserUpdate',
    },
  },

  // Scheduler Operations
  scheduler: {
    // Schedule creation
    scheduleCreation: {
      maxRequests: 50,
      windowMs: 60 * 1000, // 50 per minute
      name: 'ScheduleCreation',
    },
  },
};

/**
 * Default rate limit response formatter
 */
export function formatRateLimitResponse(
  remaining: number,
  resetTime: number,
  retryAfter?: number
) {
  return {
    error: 'Rate limit exceeded',
    message: 'You have exceeded the rate limit. Please try again later.',
    rateLimit: {
      remaining,
      resetTime: new Date(resetTime).toISOString(),
      resetIn: Math.ceil((resetTime - Date.now()) / 1000),
    },
    ...(retryAfter && { retryAfter }),
  };
}

export default RateLimitConfig;
