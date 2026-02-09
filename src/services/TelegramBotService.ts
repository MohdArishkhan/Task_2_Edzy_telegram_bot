import TelegramBot from 'node-telegram-bot-api';
import UserService from './UserService';
import JokeScheduler from './JokeScheduler';
import { rateLimiterManager } from '../utils/RateLimiterManager';

class TelegramBotService {
  private bot: TelegramBot;
  private jokeScheduler: JokeScheduler;

  constructor(token: string, jokeScheduler: JokeScheduler) {
    if (!token) {
      throw new Error('Telegram bot token is required');
    }
    this.bot = new TelegramBot(token, { polling: true });
    this.jokeScheduler = jokeScheduler;
    this.setupHandlers();
  }

  /**
   * Setup all bot command handlers
   */
  private setupHandlers(): void {
    this.bot.onText(/^\/start$/i, (msg: TelegramBot.Message) => this.handleStart(msg));
    this.bot.onText(/^start$/i, (msg: TelegramBot.Message) => this.handleStart(msg));

    this.bot.onText(/^\/enable$/i, (msg: TelegramBot.Message) => this.handleEnable(msg));
    this.bot.onText(/^enable$/i, (msg: TelegramBot.Message) => this.handleEnable(msg));

    this.bot.onText(/^\/disable$/i, (msg: TelegramBot.Message) => this.handleDisable(msg));
    this.bot.onText(/^disable$/i, (msg: TelegramBot.Message) => this.handleDisable(msg));

    this.bot.onText(/^\/frequency\s+(\d+)$/i, (msg: TelegramBot.Message, match: RegExpExecArray | null) =>
      this.handleFrequency(msg, match)
    );
    this.bot.onText(/^frequency\s+(\d+)$/i, (msg: TelegramBot.Message, match: RegExpExecArray | null) =>
      this.handleFrequency(msg, match)
    );

    this.bot.onText(/^\/status$/i, (msg: TelegramBot.Message) => this.handleStatus(msg));
    this.bot.onText(/^status$/i, (msg: TelegramBot.Message) => this.handleStatus(msg));

    this.bot.onText(/^\/help$/i, (msg: TelegramBot.Message) => this.handleHelp(msg));
    this.bot.onText(/^help$/i, (msg: TelegramBot.Message) => this.handleHelp(msg));

    this.bot.onText(/^\/test$/i, (msg: TelegramBot.Message) => this.handleTest(msg));
    this.bot.onText(/^test$/i, (msg: TelegramBot.Message) => this.handleTest(msg));

    this.bot.onText(/^\/jobstatus$/i, (msg: TelegramBot.Message) => this.handleJobStatus(msg));
    this.bot.onText(/^jobstatus$/i, (msg: TelegramBot.Message) => this.handleJobStatus(msg));

    this.bot.onText(/^\/(.+)/, (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
      if (match && match[1]) {
        const command = match[1].toLowerCase();
        const knownCommands = ['start', 'enable', 'disable', 'frequency', 'status', 'help', 'test', 'jobstatus'];
        if (!knownCommands.some(cmd => command.startsWith(cmd))) {
          this.handleUnknownCommand(msg, command);
        }
      }
    });

    this.bot.on('message', (msg: TelegramBot.Message) => {
      if (msg.text && !msg.text.startsWith('/') && !this.isCommandMessage(msg.text)) {
        this.handleUnrecognizedMessage(msg);
      }
    });

    // Error handler
    this.bot.on('polling_error', (error: Error) => {
      console.error('[TelegramBot] Polling error:', error);
    });
  }

  /**
   * Check if a text message matches any known command pattern
   * @param text - Message text to check
   * @returns true if it matches a command pattern
   */
  private isCommandMessage(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    const knownCommands = ['start', 'enable', 'disable', 'status', 'help', 'test', 'jobstatus'];
    
    // Check if it's an exact match to any command (case-insensitive)
    if (knownCommands.includes(normalizedText)) {
      return true;
    }
    
    // Check if it's a frequency command pattern
    if (/^frequency\s+\d+$/i.test(normalizedText)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check rate limit for a command
   * @param chatId - Telegram chat ID
   * @param commandName - Name of the command for rate limiter identification
   * @returns true if allowed, false if rate limited
   */
  private async checkRateLimit(chatId: number, commandName: string): Promise<boolean> {
    const limiterName = `telegram:${commandName}`;

    if (!rateLimiterManager.has(limiterName)) {
      // Fallback to general command limiter if specific one doesn't exist
      return rateLimiterManager
        .get('telegram:command')
        .checkLimit({
          identifier: String(chatId),
        }).isAllowed;
    }

    const result = rateLimiterManager
      .get(limiterName)
      .checkLimit({
        identifier: String(chatId),
      });

    if (!result.isAllowed) {
      try {
        await this.bot.sendMessage(
          chatId,
          `⚠️ You're sending commands too quickly. Please wait ${result.retryAfter || 5} seconds before trying again.`
        );
      } catch (error) {
        console.error('[TelegramBot] Error sending rate limit message:', error);
      }
    }

    return result.isAllowed;
  }

  /**
   * Handle /start command
   */
  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'start'))) {
        return;
      }

      // Create or get user
      await UserService.findOrCreateUser(chatId);

      const welcomeMessage = `Welcome to Joke Bot! 🎉\n\nI'll send you jokes at regular intervals.\n\nUse /help to see available commands.`;
      await this.bot.sendMessage(chatId, welcomeMessage);
    } catch (error) {
      console.error('[TelegramBot] Error in /start handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        'Sorry, there was an error. Please try again.'
      );
    }
  }

  /**
   * Handle /enable command
   */
  private async handleEnable(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'enable'))) {
        return;
      }

      // Check current user state
      const currentUser = await UserService.getUserByChatId(chatId);
      if (!currentUser) {
        await this.bot.sendMessage(chatId, '❌ User not found. Use /start to begin.');
        return;
      }

      if (currentUser.isEnabled) {
        await this.bot.sendMessage(chatId, '✅ Jokes are already enabled! You are receiving jokes every ' + currentUser.frequency + ' minute(s).');
        return;
      }

      const user = await UserService.enableJokes(chatId);

      // Schedule jokes for the user (async)
      await this.jokeScheduler.scheduleUserJokes(chatId, user.frequency);

      await this.bot.sendMessage(chatId, '✅ Joke delivery enabled! You will now receive jokes every ' + user.frequency + ' minute(s).');
    } catch (error) {
      console.error('[TelegramBot] Error in /enable handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Error enabling jokes. Please try again.'
      );
    }
  }

  /**
   * Handle /disable command
   */
  private async handleDisable(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'disable'))) {
        return;
      }

      // Check current user state
      const currentUser = await UserService.getUserByChatId(chatId);
      if (!currentUser) {
        await this.bot.sendMessage(chatId, '❌ User not found. Use /start to begin.');
        return;
      }

      if (!currentUser.isEnabled) {
        await this.bot.sendMessage(chatId, '⏸️ Jokes are already disabled! Use /enable to resume joke delivery.');
        return;
      }

      await UserService.disableJokes(chatId);

      // Cancel scheduled jokes for the user (async)
      await this.jokeScheduler.cancelUserSchedule(chatId);

      await this.bot.sendMessage(chatId, '⏸️ Joke delivery paused. Use /enable to resume.');
    } catch (error) {
      console.error('[TelegramBot] Error in /disable handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Error disabling jokes. Please try again.'
      );
    }
  }

  /**
   * Handle /frequency command
   */
  private async handleFrequency(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
  ): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit (frequency changes are strictly limited)
      if (!(await this.checkRateLimit(chatId, 'frequency'))) {
        return;
      }

      if (!match || !match[1]) {
        await this.bot.sendMessage(
          msg.chat.id,
          '❌ Invalid format. Use: /frequency <minutes>\n\nExample: /frequency 5'
        );
        return;
      }

      const frequency = parseInt(match[1], 10);

      if (frequency < 1 || frequency > 1440) {
        await this.bot.sendMessage(
          chatId,
          '❌ Frequency must be between 1 and 1440 minutes.'
        );
        return;
      }

      await UserService.setFrequency(chatId, frequency);

      // Reschedule jokes with the new frequency (async)
      await this.jokeScheduler.scheduleUserJokes(chatId, frequency);

      await this.bot.sendMessage(
        chatId,
        `✅ Frequency updated! You will receive jokes every ${frequency} minute(s).`
      );
    } catch (error) {
      console.error('[TelegramBot] Error in /frequency handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Error updating frequency. Please try again.'
      );
    }
  }

  /**
   * Handle /status command
   */
  private async handleStatus(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'status'))) {
        return;
      }

      const user = await UserService.getUserByChatId(chatId);

      if (!user) {
        await this.bot.sendMessage(chatId, '❌ User not found. Use /start to begin.');
        return;
      }

      const status = user.isEnabled ? '✅ Enabled' : '⏸️ Disabled';
      const lastSent = user.lastSentAt
        ? new Date(user.lastSentAt).toLocaleString()
        : 'Never';

      const statusMessage = `📊 Your Status:\n\nJokes: ${status}\nFrequency: Every ${user.frequency} minute(s)\nLast Joke: ${lastSent}`;

      await this.bot.sendMessage(chatId, statusMessage);
    } catch (error) {
      console.error('[TelegramBot] Error in /status handler:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ Error fetching status.');
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'help'))) {
        return;
      }

      const helpMessage = `📋 Available Commands:\n\n/start - Start the bot\n/enable - Resume joke delivery\n/disable - Pause joke delivery\n/frequency <n> - Set frequency (1-1440 minutes)\n/status - Check your settings\n/test - Get a joke NOW (for testing)\n/jobstatus - Check job queue status (debug)\n/help - Show this message\n\n💡 Commands work with or without / and are case-insensitive.\nExample: 'ENABLE', 'enable', '/enable' all work the same.`;

      await this.bot.sendMessage(chatId, helpMessage);
    } catch (error) {
      console.error('[TelegramBot] Error in /help handler:', error);
    }
  }

  /**
   * Handle /test command (immediate joke delivery for debugging)
   */
  private async handleTest(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'test'))) {
        return;
      }

      await this.bot.sendMessage(chatId, '🧪 Testing joke delivery... please wait...');
      
      // Immediately deliver a test joke
      await this.jokeScheduler.testDeliverJoke(chatId);
    } catch (error) {
      console.error('[TelegramBot] Error in /test handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Test failed. Check console for details.'
      );
    }
  }

  /**
   * Handle unknown/invalid commands
   */
  private async handleUnknownCommand(msg: TelegramBot.Message, command: string): Promise<void> {
    try {
      const unknownCommandMessage = `❌ Unknown command: /${command}\n\n📋 Available Commands:\n\n/start - Start the bot\n/enable - Resume joke delivery\n/disable - Pause joke delivery\n/frequency <n> - Set frequency (1-1440 minutes)\n/status - Check your settings\n/test - Get a joke NOW (for testing)\n/jobstatus - Check job queue status (debug)\n/help - Show all commands\n\n💡 Commands work with or without / and are case-insensitive.\nExample: 'ENABLE', 'enable', '/enable' all work the same.`;

      await this.bot.sendMessage(msg.chat.id, unknownCommandMessage);
    } catch (error) {
      console.error('[TelegramBot] Error in unknown command handler:', error);
    }
  }

  /**
   * Handle unrecognized non-command messages
   */
  private async handleUnrecognizedMessage(msg: TelegramBot.Message): Promise<void> {
    try {
      const helpMessage = `🤔 I didn't understand that message.\n\n📋 Available Commands:\n\n/start - Start the bot\n/enable - Resume joke delivery\n/disable - Pause joke delivery\n/frequency <n> - Set frequency (1-1440 minutes)\n/status - Check your settings\n/help - Show all commands\n\n💡 Commands work with or without / and are case-insensitive.\nExample: 'ENABLE', 'enable', '/enable' all work the same.\n\nType /help for more information.`;

      await this.bot.sendMessage(msg.chat.id, helpMessage);
    } catch (error) {
      console.error('[TelegramBot] Error in unrecognized message handler:', error);
    }
  }

  /**
   * Handle /jobstatus command - show job status for debugging
   */
  private async handleJobStatus(msg: TelegramBot.Message): Promise<void> {
    try {
      const chatId = msg.chat.id;

      // Check rate limit
      if (!(await this.checkRateLimit(chatId, 'status'))) {
        return;
      }

      await this.bot.sendMessage(chatId, '📊 Checking job status in database...');
      
      // Get Agenda status through AgendaScheduler
      const agendaScheduler = this.jokeScheduler['agendaScheduler'];
      await agendaScheduler.getStatus();
      
      await this.bot.sendMessage(chatId, '✅ Job status logged to console. Check server logs for details.');
    } catch (error) {
      console.error('[TelegramBot] Error in /jobstatus handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Job status check failed. Check console for details.'
      );
    }
  }

  /**
   * Send a joke to a specific user
   * @param chatId - Telegram chat ID
   * @param joke - Joke text
   */
  async sendJoke(chatId: number, joke: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `😂 *Joke time!*\n\n${joke}`, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error(`[TelegramBot] Failed to send joke to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get the bot instance
   */
  getBot(): TelegramBot {
    return this.bot;
  }

  /**
   * Stop bot polling
   */
  async stop(): Promise<void> {
    await this.bot.stopPolling();
  }
}

export default TelegramBotService;
