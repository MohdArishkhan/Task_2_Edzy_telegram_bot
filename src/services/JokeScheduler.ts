import cron from 'node-cron';
import UserService from './UserService';
import JokeService from './JokeService';
import TelegramBotService from './TelegramBotService';

interface ScheduledJob {
  chatId: number;
  job: cron.ScheduledTask;
}

class JokeScheduler {
  private scheduledJobs: Map<number, ScheduledJob> = new Map();
  private botService: TelegramBotService | null;

  constructor(botService?: TelegramBotService) {
    this.botService = botService || null;
  }

  /**
   * Set the bot service (for circular dependency resolution)
   */
  setBotService(botService: TelegramBotService): void {
    this.botService = botService;
  }

  /**
   * Start the joke scheduler - schedules all enabled users
   */
  async start(): Promise<void> {
    try {
      const enabledUsers = await UserService.getAllEnabledUsers();

      console.log(
        `[JokeScheduler] Starting scheduler for ${enabledUsers.length} users`
      );

      for (const user of enabledUsers) {
        this.scheduleUserJokes(user.chatId, user.frequency);
      }

      console.log('[JokeScheduler] Scheduler started successfully');
    } catch (error) {
      console.error('[JokeScheduler] Error starting scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule jokes for a specific user
   * @param chatId - User's chat ID
   * @param frequency - Minutes between jokes
   */
  scheduleUserJokes(chatId: number, frequency: number): void {
    // Cancel existing job if any
    if (this.scheduledJobs.has(chatId)) {
      this.cancelUserSchedule(chatId);
    }

    // Create cron expression: every n minutes
    // Cron format: minute hour day month weekday
    const cronExpression = `*/${frequency} * * * *`;

    try {
      const job = cron.schedule(cronExpression, () => {
        console.log(`[JokeScheduler] ⏰ Executing cron job for user ${chatId} - delivering joke...`);
        this.deliverJoke(chatId);
      });

      this.scheduledJobs.set(chatId, { chatId, job });

      console.log(
        `[JokeScheduler] ✅ Scheduled jokes for user ${chatId} every ${frequency} minute(s)`
      );
      console.log(`[JokeScheduler] 📅 Cron expression: "${cronExpression}"`);
    } catch (error) {
      console.error(
        `[JokeScheduler] Error scheduling jokes for user ${chatId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Cancel joke schedule for a specific user
   * @param chatId - User's chat ID
   */
  cancelUserSchedule(chatId: number): void {
    const scheduled = this.scheduledJobs.get(chatId);

    if (scheduled) {
      scheduled.job.stop();
      this.scheduledJobs.delete(chatId);
      console.log(`[JokeScheduler] Cancelled jokes for user ${chatId}`);
    }
  }

  /**
   * Test deliver a joke immediately (without waiting for cron)
   * @param chatId - User's chat ID
   */
  async testDeliverJoke(chatId: number): Promise<void> {
    console.log(`[JokeScheduler] 🧪 TEST MODE: Attempting to deliver test joke to user ${chatId}...`);
    await this.deliverJoke(chatId);
  }

  /**
   * Deliver a joke to a user
   * @param chatId - User's chat ID
   */
  private async deliverJoke(chatId: number): Promise<void> {
    try {
      if (!this.botService) {
        console.error('[JokeScheduler] ❌ Bot service not initialized');
        return;
      }

      console.log(`[JokeScheduler] 📝 Fetching joke for user ${chatId}...`);
      const user = await UserService.getUserByChatId(chatId);

      // Check if user exists and is still enabled
      if (!user || !user.isEnabled) {
        console.log(`[JokeScheduler] ⚠️  User ${chatId} not found or disabled, cancelling schedule`);
        this.cancelUserSchedule(chatId);
        return;
      }

      // Fetch and send joke
      console.log(`[JokeScheduler] 🎭 Getting formatted joke...`);
      const joke = await JokeService.getFormattedJoke();
      console.log(`[JokeScheduler] 📤 Sending joke to user ${chatId}...`);
      await this.botService.sendJoke(chatId, joke);

      // Update last sent timestamp
      await UserService.updateLastSentAt(chatId);
      console.log(`[JokeScheduler] ✅ Joke successfully delivered to user ${chatId}`);
    } catch (error) {
      console.error(
        `[JokeScheduler] ❌ Error delivering joke to user ${chatId}:`,
        error
      );
    }
  }

  /**
   * Update user frequency and reschedule
   * @param chatId - User's chat ID
   * @param newFrequency - New frequency in minutes
   */
  async updateUserSchedule(chatId: number, newFrequency: number): Promise<void> {
    try {
      this.scheduleUserJokes(chatId, newFrequency);
      console.log(
        `[JokeScheduler] Updated schedule for user ${chatId} to every ${newFrequency} minute(s)`
      );
    } catch (error) {
      console.error(
        `[JokeScheduler] Error updating schedule for user ${chatId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    for (const [, scheduled] of this.scheduledJobs) {
      scheduled.job.stop();
    }

    this.scheduledJobs.clear();
    console.log('[JokeScheduler] All scheduled jobs stopped');
  }

  /**
   * Get number of active schedules
   */
  getActiveScheduleCount(): number {
    return this.scheduledJobs.size;
  }
}

export default JokeScheduler;
