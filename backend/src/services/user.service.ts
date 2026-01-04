import { Types } from 'mongoose';
import { User, IUserDocument } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { IUserPreferences, IUserProfile } from '../types/index.js';

export class UserService {
  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<{
      displayName: string;
      profile: Partial<IUserProfile>;
    }>
  ): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (updates.displayName) {
      user.displayName = updates.displayName;
    }

    if (updates.profile) {
      user.profile = {
        ...user.profile,
        ...updates.profile,
      };
    }

    await user.save();
    return user;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<IUserPreferences>
  ): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (preferences.notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...preferences.notifications,
      };
    }

    if (preferences.theme) {
      user.preferences.theme = preferences.theme;
    }

    if (preferences.hapticFeedback !== undefined) {
      user.preferences.hapticFeedback = preferences.hapticFeedback;
    }

    await user.save();
    return user;
  }

  /**
   * Get user statistics
   */
  async getStatistics(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalHabitsCompleted: number;
    totalPlansCreated: number;
    averageWeeklyScore: number;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return user.statistics;
  }

  /**
   * Update user statistics
   */
  async updateStatistics(
    userId: string,
    updates: Partial<{
      currentStreak: number;
      longestStreak: number;
      totalHabitsCompleted: number;
      totalPlansCreated: number;
      averageWeeklyScore: number;
    }>
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (updates.currentStreak !== undefined) {
      user.statistics.currentStreak = updates.currentStreak;
    }
    if (updates.longestStreak !== undefined) {
      user.statistics.longestStreak = updates.longestStreak;
    }
    if (updates.totalHabitsCompleted !== undefined) {
      user.statistics.totalHabitsCompleted = updates.totalHabitsCompleted;
    }
    if (updates.totalPlansCreated !== undefined) {
      user.statistics.totalPlansCreated = updates.totalPlansCreated;
    }
    if (updates.averageWeeklyScore !== undefined) {
      user.statistics.averageWeeklyScore = updates.averageWeeklyScore;
    }

    await user.save();
  }

  /**
   * Increment habits completed count
   */
  async incrementHabitsCompleted(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'statistics.totalHabitsCompleted': 1 },
    });
  }

  /**
   * Increment plans created count
   */
  async incrementPlansCreated(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'statistics.totalPlansCreated': 1 },
    });
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      lastActiveAt: new Date(),
    });
  }
}

export const userService = new UserService();

