import User, { IUser } from '../models/User';

class UserService {
  /**
   * Find or create a user by chat ID
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser> - User document
   */
  async findOrCreateUser(chatId: number): Promise<IUser> {
    let user = await User.findOne({ chatId });

    if (!user) {
      user = await User.create({
        chatId,
        isEnabled: true,
        frequency: 1,
      });
    }

    return user;
  }

  /**
   * Get user by chat ID
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser | null> - User document or null if not found
   */
  async getUserByChatId(chatId: number): Promise<IUser | null> {
    return User.findOne({ chatId });
  }

  /**
   * Update user frequency
   * @param chatId - Telegram chat ID
   * @param frequency - Minutes between jokes (1-1440)
   * @returns Promise<IUser> - Updated user document
   */
  async setFrequency(chatId: number, frequency: number): Promise<IUser> {
    if (frequency < 1 || frequency > 1440) {
      throw new Error('Frequency must be between 1 and 1440 minutes');
    }

    const user = await User.findOneAndUpdate(
      { chatId },
      { frequency },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error(`User with chatId ${chatId} not found`);
    }

    return user as unknown as IUser;
  }

  /**
   * Enable joke delivery for a user
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser> - Updated user document
   */
  async enableJokes(chatId: number): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { chatId },
      { isEnabled: true },
      { new: true }
    );

    if (!user) {
      throw new Error(`User with chatId ${chatId} not found`);
    }

    return user as unknown as IUser;
  }

  /**
   * Disable joke delivery for a user
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser> - Updated user document
   */
  async disableJokes(chatId: number): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { chatId },
      { isEnabled: false },
      { new: true }
    );

    if (!user) {
      throw new Error(`User with chatId ${chatId} not found`);
    }

    return user as unknown as IUser;
  }

  /**
   * Update last sent timestamp
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser> - Updated user document
   */
  async updateLastSentAt(chatId: number): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { chatId },
      { lastSentAt: new Date() },
      { new: true }
    );

    if (!user) {
      throw new Error(`User with chatId ${chatId} not found`);
    }

    return user as unknown as IUser;
  }

  /**
   * Get all enabled users
   * @returns Promise<IUser[]> - Array of enabled users
   */
  async getAllEnabledUsers(): Promise<IUser[]> {
    return User.find({ isEnabled: true });
  }

  /**
   * Delete user by chat ID
   * @param chatId - Telegram chat ID
   * @returns Promise<IUser | null> - Deleted user document
   */
  async deleteUser(chatId: number): Promise<IUser | null> {
    const user = await User.findOneAndDelete({ chatId });
    return (user as unknown as IUser) || null;
  }
}

export default new UserService();
