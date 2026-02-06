import dotenv from 'dotenv';
import express from 'express';
import { connectDB, disconnectDB } from './config/database';
import TelegramBotService from './services/TelegramBotService';
import JokeScheduler from './services/JokeScheduler';
import { createRateLimitMiddleware } from './utils/rateLimitMiddleware';
import { rateLimiterManager } from './utils/RateLimiterManager';
import RateLimitConfig from './config/rateLimitConfig';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('[Error] TELEGRAM_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

let botService: TelegramBotService;
let jokeScheduler: JokeScheduler;

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  try {
    // Initialize rate limiters
    rateLimiterManager.initializeAll();

    // Connect to MongoDB
    await connectDB();

    // Initialize Joke Scheduler first (without botService)
    jokeScheduler = new JokeScheduler();

    // Initialize Telegram Bot with jokeScheduler reference
    botService = new TelegramBotService(TELEGRAM_BOT_TOKEN as string, jokeScheduler);

    // Set botService on jokeScheduler for circular dependency resolution
    jokeScheduler.setBotService(botService);

    // Start the joke scheduler
    await jokeScheduler.start();

    console.log('[App] Application initialized successfully');
  } catch (error) {
    console.error('[App] Initialization error:', error);
    process.exit(1);
  }
}

/**
 * Health check endpoint with rate limiting
 */
app.get(
  '/health',
  createRateLimitMiddleware(RateLimitConfig.api.health),
  (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeSchedules: jokeScheduler?.getActiveScheduleCount() || 0,
    });
  }
);

/**
 * Get server status with rate limiting
 */
app.get(
  '/status',
  createRateLimitMiddleware(RateLimitConfig.api.status),
  (_req, res) => {
    try {
      res.status(200).json({
        bot: 'running',
        scheduler: 'running',
        activeUsers: jokeScheduler?.getActiveScheduleCount() || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
);

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(): Promise<void> {
  console.log('[App] Shutting down gracefully...');

  try {
    // Cleanup rate limiters
    rateLimiterManager.cleanupAll();

    if (jokeScheduler) {
      jokeScheduler.stopAll();
    }

    if (botService) {
      await botService.stop();
    }

    await disconnectDB();

    console.log('[App] Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('[App] Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the application
initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[App] Server running on port ${PORT}`);
      console.log('[App] Telegram bot is polling for messages...');
    });
  })
  .catch((error) => {
    console.error('[App] Failed to start application:', error);
    process.exit(1);
  });

export default app;
