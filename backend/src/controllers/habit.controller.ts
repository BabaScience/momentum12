import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { habitService } from '../services/habit.service.js';
import { IAuthRequest, IApiResponse, FrequencyType } from '../types/index.js';

const createHabitSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  planId: z.string().optional(),
  frequency: z.object({
    type: z.nativeEnum(FrequencyType),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timesPerWeek: z.number().min(1).max(7).optional(),
  }).default({ type: FrequencyType.DAILY }),
  reminders: z.object({
    enabled: z.boolean(),
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)),
    sound: z.string().optional(),
  }).optional(),
  appearance: z.object({
    iconName: z.string(),
    colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    emoji: z.string().optional(),
  }).optional(),
  targetStreak: z.number().min(1).optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  frequency: z.object({
    type: z.nativeEnum(FrequencyType),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timesPerWeek: z.number().min(1).max(7).optional(),
  }).optional(),
  reminders: z.object({
    enabled: z.boolean(),
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)),
    sound: z.string().optional(),
  }).optional(),
  appearance: z.object({
    iconName: z.string(),
    colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    emoji: z.string().optional(),
  }).optional(),
  targetStreak: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

export class HabitController {
  /**
   * POST /api/v1/habits
   */
  async createHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input = createHabitSchema.parse(req.body);

      const habit = await habitService.createHabit(userId, input);

      const response: IApiResponse = {
        success: true,
        message: 'Habit created successfully',
        data: { habit },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/habits
   */
  async getHabits(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const activeOnly = req.query.active !== 'false';

      const habits = await habitService.getHabits(userId, activeOnly);

      const response: IApiResponse = {
        success: true,
        data: { habits },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/habits/today
   */
  async getHabitsForToday(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const habits = await habitService.getHabitsForToday(userId);

      const response: IApiResponse = {
        success: true,
        data: { habits },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/habits/:habitId
   */
  async getHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;

      const habit = await habitService.getHabitById(userId, habitId);

      const response: IApiResponse = {
        success: true,
        data: { habit },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/habits/:habitId
   */
  async updateHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;
      const updates = updateHabitSchema.parse(req.body);

      const habit = await habitService.updateHabit(userId, habitId, updates);

      const response: IApiResponse = {
        success: true,
        message: 'Habit updated successfully',
        data: { habit },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/habits/:habitId
   */
  async deleteHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;

      await habitService.deleteHabit(userId, habitId);

      const response: IApiResponse = {
        success: true,
        message: 'Habit deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/habits/:habitId/archive
   */
  async archiveHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;

      const habit = await habitService.archiveHabit(userId, habitId);

      const response: IApiResponse = {
        success: true,
        message: 'Habit archived successfully',
        data: { habit },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/habits/:habitId/statistics
   */
  async getStatistics(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;

      const statistics = await habitService.getHabitStatistics(userId, habitId);

      const response: IApiResponse = {
        success: true,
        data: { statistics },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/habits/:habitId/history
   */
  async getHistory(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { habitId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const history = await habitService.getHabitHistory(userId, habitId, days);

      const response: IApiResponse = {
        success: true,
        data: { history },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const habitController = new HabitController();

