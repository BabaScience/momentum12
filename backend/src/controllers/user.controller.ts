import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service.js';
import { IAuthRequest, IApiResponse, Theme, WeekStartDay, PreferredUnits } from '../types/index.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  profile: z.object({
    avatarUrl: z.string().url().optional().nullable(),
    timezone: z.string().optional(),
    weekStartDay: z.nativeEnum(WeekStartDay).optional(),
    preferredUnits: z.nativeEnum(PreferredUnits).optional(),
  }).optional(),
});

const updatePreferencesSchema = z.object({
  notifications: z.object({
    dailyReminder: z.boolean().optional(),
    weeklyReview: z.boolean().optional(),
    streakMilestones: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  }).optional(),
  theme: z.nativeEnum(Theme).optional(),
  hapticFeedback: z.boolean().optional(),
});

export class UserController {
  /**
   * GET /api/v1/users/profile
   */
  async getProfile(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await userService.getProfile(userId);

      const response: IApiResponse = {
        success: true,
        data: { user },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/users/profile
   */
  async updateProfile(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const updates = updateProfileSchema.parse(req.body);

      const user = await userService.updateProfile(userId, updates);

      const response: IApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/users/preferences
   */
  async updatePreferences(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const preferences = updatePreferencesSchema.parse(req.body);

      const user = await userService.updatePreferences(userId, preferences);

      const response: IApiResponse = {
        success: true,
        message: 'Preferences updated successfully',
        data: { user },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/statistics
   */
  async getStatistics(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const statistics = await userService.getStatistics(userId);

      const response: IApiResponse = {
        success: true,
        data: { statistics },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

