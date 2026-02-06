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
    // /start command
    this.bot.onText(/\/start/, (msg: TelegramBot.Message) => this.handleStart(msg));

    // /enable command
    this.bot.onText(/\/enable/, (msg: TelegramBot.Message) => this.handleEnable(msg));

    // /disable command
    this.bot.onText(/\/disable/, (msg: TelegramBot.Message) => this.handleDisable(msg));

    // /frequency command
    this.bot.onText(/\/frequency\s(\d+)/, (msg: TelegramBot.Message, match: RegExpExecArray | null) =>
      this.handleFrequency(msg, match)
    );

    // /status command
    this.bot.onText(/\/status/, (msg: TelegramBot.Message) => this.handleStatus(msg));

    // /help command
    this.bot.onText(/\/help/, (msg: TelegramBot.Message) => this.handleHelp(msg));

    // /test command (for debugging)
    this.bot.onText(/\/test/, (msg: TelegramBot.Message) => this.handleTest(msg));

    // Unknown command handler (catch-all for slash commands)
    this.bot.onText(/^\/(.+)/, (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
      if (match && match[1]) {
        const command = match[1];
        // Check if it's a known command
        const knownCommands = ['start', 'enable', 'disable', 'frequency', 'status', 'help', 'test'];
        if (!knownCommands.some(cmd => command.startsWith(cmd))) {
          this.handleUnknownCommand(msg, command);
        }
      }
    });

    // Error handler
    this.bot.on('polling_error', (error: Error) => {
      console.error('[TelegramBot] Polling error:', error);
    });

    console.log('[TelegramBot] Bot handlers initialized');
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

      console.log(`[TelegramBot] User started bot: ${chatId}`);
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

      const user = await UserService.enableJokes(chatId);

      // Schedule jokes for the user
      this.jokeScheduler.scheduleUserJokes(chatId, user.frequency);

      await this.bot.sendMessage(chatId, '✅ Joke delivery enabled! You will now receive jokes.');
      console.log(`[TelegramBot] Jokes enabled and scheduled for user ${chatId}`);
    } catch (error) {
      console.error('[TelegramBot] Error in /enable handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Error enabling jokes. User not found.'
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

      await UserService.disableJokes(chatId);

      // Cancel scheduled jokes for the user
      this.jokeScheduler.cancelUserSchedule(chatId);

      await this.bot.sendMessage(chatId, '⏸️ Joke delivery paused. Use /enable to resume.');
      console.log(`[TelegramBot] Jokes disabled and schedule cancelled for user ${chatId}`);
    } catch (error) {
      console.error('[TelegramBot] Error in /disable handler:', error);
      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Error disabling jokes. User not found.'
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

      // Reschedule jokes with the new frequency
      this.jokeScheduler.scheduleUserJokes(chatId, frequency);

      await this.bot.sendMessage(
        chatId,
        `✅ Frequency updated! You will receive jokes every ${frequency} minute(s).`
      );
      console.log(`[TelegramBot] Frequency updated and rescheduled for user ${chatId}: ${frequency} minutes`);
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

      const helpMessage = `📋 Available Commands:\n\n/start - Start the bot\n/enable - Resume joke delivery\n/disable - Pause joke delivery\n/frequency <n> - Set frequency (1-1440 minutes)\n/status - Check your settings\n/test - Get a joke NOW (for testing)\n/help - Show this message`;

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
      
      console.log(`[TelegramBot] 🧪 Test command triggered by user ${chatId}`);
      
      // Immediately deliver a test joke
      await this.jokeScheduler.testDeliverJoke(chatId);
      
      console.log(`[TelegramBot] ✅ Test completed for user ${chatId}`);
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
      const unknownCommandMessage = `❌ Unknown command: /${command}\n\n📋 Available Commands:\n\n/start - Start the bot\n/enable - Resume joke delivery\n/disable - Pause joke delivery\n/frequency <n> - Set frequency (1-1440 minutes)\n/status - Check your settings\n/test - Get a joke NOW (for testing)\n/help - Show all commands\n\nUse /help to see available commands.`;

      await this.bot.sendMessage(msg.chat.id, unknownCommandMessage);
      console.log(`[TelegramBot] Unknown command received from user ${msg.chat.id}: /${command}`);
    } catch (error) {
      console.error('[TelegramBot] Error in unknown command handler:', error);
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
      console.log(`[TelegramBot] Joke sent to user: ${chatId}`);
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
    console.log('[TelegramBot] Bot stopped');
  }
}

export default TelegramBotService;
