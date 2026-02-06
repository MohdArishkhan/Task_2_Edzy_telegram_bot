import AgendaScheduler from './AgendaScheduler';
import TelegramBotService from './TelegramBotService';

class JokeScheduler {
  private agendaScheduler: AgendaScheduler;

  constructor() {
    this.agendaScheduler = new AgendaScheduler();
  }

  /**
   * Set the bot service (for circular dependency resolution)
   */
  setBotService(botService: TelegramBotService): void {
    this.agendaScheduler.setBotService(botService);
  }

  /**
   * Start the joke scheduler - initializes Agenda and schedules all enabled users
   */
  async start(): Promise<void> {
    try {
      // Initialize Agenda with MongoDB
      await this.agendaScheduler.initialize();

      // Load and schedule all enabled users
      await this.agendaScheduler.start();
      // Scheduler started successfully with Agenda
    } catch (error) {
      console.error('[JokeScheduler] Error starting scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule jokes for a specific user
   * Uses persistent MongoDB-backed Agenda
   * @param chatId - User's chat ID
   * @param frequency - Minutes between jokes
   */
  async scheduleUserJokes(chatId: number, frequency: number): Promise<void> {
    try {
      await this.agendaScheduler.scheduleUserJokes(chatId, frequency);
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
   * Removes persistent job from MongoDB
   * @param chatId - User's chat ID
   */
  async cancelUserSchedule(chatId: number): Promise<void> {
    try {
      await this.agendaScheduler.cancelUserSchedule(chatId);
    } catch (error) {
      console.error(
        `[JokeScheduler] Error cancelling schedule for user ${chatId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Test deliver a joke immediately (without waiting for scheduled time)
   * @param chatId - User's chat ID
   */
  async testDeliverJoke(chatId: number): Promise<void> {
    try {
      await this.agendaScheduler.testDeliverJoke(chatId);
    } catch (error) {
      console.error('[JokeScheduler] Error in test delivery:', error);
      throw error;
    }
  }

  /**
   * Update user frequency and reschedule
   * @param chatId - User's chat ID
   * @param newFrequency - New frequency in minutes
   */
  async updateUserSchedule(
    chatId: number,
    newFrequency: number
  ): Promise<void> {
    try {
      await this.agendaScheduler.updateUserSchedule(chatId, newFrequency);
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
   * Gracefully shuts down Agenda
   */
  async stopAll(): Promise<void> {
    try {
      await this.agendaScheduler.stop();
    } catch (error) {
      console.error('[JokeScheduler] Error stopping scheduler:', error);
      throw error;
    }
  }

  /**
   * Get number of active schedules
   */
  async getActiveScheduleCount(): Promise<number> {
    return await this.agendaScheduler.getActiveScheduleCount();
  }

  /**
   * Get job status for debugging
   */
  async getStatus(): Promise<void> {
    await this.agendaScheduler.getStatus();
  }
}

export default JokeScheduler;
