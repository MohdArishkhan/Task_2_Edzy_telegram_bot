/**
 * Agenda-based Job Scheduler
 * Uses MongoDB for persistent job storage
 * Ensures jobs are executed even after server restarts
 */

import Agenda from 'agenda';
import UserService from './UserService';
import JokeService from './JokeService';
import TelegramBotService from './TelegramBotService';

interface ScheduledJob {
  chatId: number;
  jobId: string;
}

class AgendaScheduler {
  private agenda: Agenda | null = null;
  private scheduledJobs: Map<number, ScheduledJob> = new Map();
  private botService: TelegramBotService | null = null;
  private mongoUri: string;

  constructor(mongoUri?: string) {
    this.mongoUri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_joke_bot';
  }

  /**
   * Initialize Agenda with MongoDB
   */
  async initialize(): Promise<void> {
    try {
      this.agenda = new Agenda({
        db: {
          address: this.mongoUri,
          collection: 'agenda_jobs',
        },
        processEvery: '10 seconds', // Check for jobs every 10 seconds (faster execution)
        maxConcurrency: 20,
      });

      // Add event listeners for debugging
      this.agenda.on('ready', () => {
        // Agenda is ready
      });

      this.agenda.on('start', (_job) => {
        // Job started
      });

      this.agenda.on('complete', (_job) => {
        // Job completed
      });

      this.agenda.on('fail', (err, job) => {
        console.error(`[AgendaScheduler] ❌ Job failed: ${job.attrs.name}`, err);
      });

      // Define job handlers
      this.defineJobs();

      // Start the agenda
      await this.agenda.start();
      // Agenda initialized and started
    } catch (error) {
      console.error('[AgendaScheduler] Error initializing Agenda:', error);
      throw error;
    }
  }

  /**
   * Set the bot service
   */
  setBotService(botService: TelegramBotService): void {
    this.botService = botService;
  }

  /**
   * Define all job handlers
   */
  private defineJobs(): void {
    if (!this.agenda) return;

    // Define the deliver-joke job
    this.agenda.define('deliver-joke', async (job: any) => {
      const { chatId } = job.attrs.data;
      
      // Check if botService is available
      if (!this.botService) {
        console.warn(`[AgendaScheduler] ⚠️  Bot service not initialized for job ${chatId}, retrying later...`);
        throw new Error('Bot service not initialized');
      }
      
      try {
        await this.deliverJoke(chatId);
      } catch (error) {
        console.error(`[AgendaScheduler] Error delivering joke to user ${chatId}:`, error);
        throw error; // Agenda will retry the job
      }
    });
    // Job handlers defined
  }

  /**
   * Start the scheduler and load all enabled users
   */
  async start(): Promise<void> {
    try {
      const enabledUsers = await UserService.getAllEnabledUsers();

      for (const user of enabledUsers) {
        await this.scheduleUserJokes(user.chatId, user.frequency);
      }
      // Scheduler started successfully
    } catch (error) {
      console.error('[AgendaScheduler] Error starting scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule jokes for a specific user
   * Creates recurring job that persists in MongoDB
   * @param chatId - User's chat ID
   * @param frequency - Minutes between jokes
   */
  async scheduleUserJokes(chatId: number, frequency: number): Promise<void> {
    if (!this.agenda) {
      throw new Error('Agenda not initialized');
    }

    try {
      // First, cancel ALL existing jobs for this user to prevent duplicates
      await this.agenda.cancel({ 
        name: 'deliver-joke',
        'data.chatId': chatId 
      });
      
      // Clear from local tracking
      this.scheduledJobs.delete(chatId);

      // Schedule recurring job
      // Repeat every n minutes
      const job = this.agenda.create('deliver-joke', { chatId });
      
      job.repeatEvery(`${frequency} minutes`, {
        skipImmediate: false, // Run immediately on server startup if due
      });

      // Save the job to MongoDB
      await job.save();

      // Store reference
      this.scheduledJobs.set(chatId, {
        chatId,
        jobId: String(job.attrs._id),
      });
    } catch (error) {
      console.error(
        `[AgendaScheduler] Error scheduling jokes for user ${chatId}:`,
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
    if (!this.agenda) {
      throw new Error('Agenda not initialized');
    }

    try {
      // Cancel jobs by chatId in data field (more reliable than job name)
      await this.agenda.cancel({ 
        name: 'deliver-joke',
        'data.chatId': chatId 
      });
      
      this.scheduledJobs.delete(chatId);
    } catch (error) {
      console.error(
        `[AgendaScheduler] Error cancelling schedule for user ${chatId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Test deliver a joke immediately
   * @param chatId - User's chat ID
   */
  async testDeliverJoke(chatId: number): Promise<void> {
    await this.deliverJoke(chatId);
  }

  /**
   * Deliver a joke to a user
   * @param chatId - User's chat ID
   */
  private async deliverJoke(chatId: number): Promise<void> {
    try {
      if (!this.botService) {
        console.error('[AgendaScheduler] ❌ Bot service not initialized');
        throw new Error('Bot service not available');
      }

      const user = await UserService.getUserByChatId(chatId);

      // Check if user exists and is still enabled
      if (!user || !user.isEnabled) {
        await this.cancelUserSchedule(chatId);
        return;
      }

      // Fetch and send joke
      const joke = await JokeService.getFormattedJoke();
      await this.botService.sendJoke(chatId, joke);

      // Update last sent timestamp
      await UserService.updateLastSentAt(chatId);
    } catch (error) {
      console.error(
        `[AgendaScheduler] ❌ Error delivering joke to user ${chatId}:`,
        error
      );
      throw error; // Re-throw to allow Agenda to handle retries
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
      await this.scheduleUserJokes(chatId, newFrequency);
    } catch (error) {
      console.error(
        `[AgendaScheduler] Error updating schedule for user ${chatId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Stop the agenda scheduler
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    if (this.agenda) {
      try {
        await this.agenda.stop();
        this.scheduledJobs.clear();
      } catch (error) {
        console.error('[AgendaScheduler] Error stopping agenda:', error);
        throw error;
      }
    }
  }

  /**
   * Get number of active scheduled jobs for this user
   */
  async getActiveScheduleCount(): Promise<number> {
    if (!this.agenda) return 0;
    
    try {
      const jobs = await this.agenda.jobs({
        $or: Array.from(this.scheduledJobs.keys()).map((chatId) => ({
          name: `deliver-joke-${chatId}`,
        })),
      });
      return jobs.length;
    } catch (error) {
      console.error('[AgendaScheduler] Error getting active schedule count:', error);
      return this.scheduledJobs.size;
    }
  }

  /**
   * Get detailed job information
   */
  async getJobInfo(chatId: number): Promise<any> {
    if (!this.agenda) return null;

    try {
      const jobName = `deliver-joke-${chatId}`;
      const jobs = await this.agenda.jobs({ name: jobName });
      return jobs.length > 0 ? jobs[0] : null;
    } catch (error) {
      console.error(
        `[AgendaScheduler] Error getting job info for user ${chatId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get all scheduled jobs
   */
  async getAllJobs(): Promise<any[]> {
    if (!this.agenda) return [];

    try {
      return await this.agenda.jobs({});
    } catch (error) {
      console.error('[AgendaScheduler] Error getting all jobs:', error);
      return [];
    }
  }

  /**
   * Enable test mode - log all job executions
   */
  async enableTestMode(): Promise<void> {
    if (!this.agenda) return;

    this.agenda.on('start', (_job: any) => {
      // Job started
    });

    this.agenda.on('complete', (_job: any) => {
      // Job completed
    });

    this.agenda.on('fail', (err: any, job: any) => {
      console.error(`[AgendaScheduler] Job failed: ${job.attrs.name}`, err);
    });
  }

  /**
   * Manually trigger a joke for testing purposes
   * @param chatId - User's chat ID
   */
  async testJoke(chatId: number): Promise<void> {
    await this.deliverJoke(chatId);
  }

  /**
   * Check Agenda status and running jobs
   */
  async getStatus(): Promise<void> {
    if (!this.agenda) {
      return;
    }

    const jobs = await this.agenda.jobs({});
    
    // Output job information for debugging
    for (const job of jobs) {
      console.log(`[AgendaScheduler] Job: ${job.attrs.name}, NextRun: ${job.attrs.nextRunAt}, Data:`, job.attrs.data);
    }
  }

}

export default AgendaScheduler;
