import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service.js';
import { IAuthRequest, IApiResponse } from '../types/index.js';

const rangeSchema = z.enum(['week', 'month', '12weeks']).default('month');

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   */
  async getDashboard(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dashboard = await analyticsService.getDashboard(userId);

      const response: IApiResponse = {
        success: true,
        data: { dashboard },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/trends
   */
  async getTrends(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const range = rangeSchema.parse(req.query.range || 'month');

      const trends = await analyticsService.getTrends(userId, range);

      const response: IApiResponse = {
        success: true,
        data: { trends },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/weekly-report/:weekNumber
   */
  async getWeeklyReport(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const weekNumber = parseInt(req.params.weekNumber);

      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 12) {
        const response: IApiResponse = {
          success: false,
          message: 'Week number must be between 1 and 12',
        };
        res.status(400).json(response);
        return;
      }

      const report = await analyticsService.getWeeklyReport(userId, weekNumber);

      const response: IApiResponse = {
        success: true,
        data: { report },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/completion-heatmap
   */
  async getCompletionHeatmap(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 90;

      const streakHistory = await analyticsService.getStreakHistory(userId, days);

      const response: IApiResponse = {
        success: true,
        data: { heatmap: streakHistory },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/habit-performance
   */
  async getHabitPerformance(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const performance = await analyticsService.getHabitPerformance(userId);

      const response: IApiResponse = {
        success: true,
        data: { performance },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/goal-progress/:planId
   */
  async getGoalProgress(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;

      const progress = await analyticsService.getGoalProgress(userId, planId);

      const response: IApiResponse = {
        success: true,
        data: { progress },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();

