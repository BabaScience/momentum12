import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { executionService } from '../services/execution.service.js';
import { IAuthRequest, IApiResponse } from '../types/index.js';

const completeHabitSchema = z.object({
  timeSpent: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const reflectionSchema = z.object({
  wins: z.string().max(1000),
  challenges: z.string().max(1000),
  learnings: z.string().max(1000),
  gratitude: z.string().max(500).optional(),
});

const addActionSchema = z.object({
  weeklyGoalId: z.string(),
  description: z.string().max(500),
});

export class ExecutionController {
  /**
   * GET /api/v1/executions/today
   */
  async getTodayExecution(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const execution = await executionService.getTodayExecution(userId);

      const response: IApiResponse = {
        success: true,
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/executions/:date
   */
  async getExecutionByDate(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { date } = req.params;

      const execution = await executionService.getExecutionByDate(userId, new Date(date));

      const response: IApiResponse = {
        success: true,
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/executions/:executionId/detail
   */
  async getExecution(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId } = req.params;

      const execution = await executionService.getExecutionById(userId, executionId);

      const response: IApiResponse = {
        success: true,
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/executions/:executionId/habits/:habitId/complete
   */
  async completeHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId, habitId } = req.params;
      const { timeSpent, notes } = completeHabitSchema.parse(req.body);

      const execution = await executionService.completeHabit(
        userId,
        executionId,
        habitId,
        timeSpent,
        notes
      );

      const response: IApiResponse = {
        success: true,
        message: 'Habit completed successfully',
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/executions/:executionId/habits/:habitId/uncomplete
   */
  async uncompleteHabit(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId, habitId } = req.params;

      const execution = await executionService.uncompleteHabit(userId, executionId, habitId);

      const response: IApiResponse = {
        success: true,
        message: 'Habit uncompleted',
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/executions/:executionId/actions/:actionId/complete
   */
  async completeAction(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId, actionId } = req.params;

      const execution = await executionService.completeAction(userId, executionId, actionId);

      const response: IApiResponse = {
        success: true,
        message: 'Action completed successfully',
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/executions/:executionId/reflection
   */
  async addReflection(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId } = req.params;
      const reflection = reflectionSchema.parse(req.body);

      const execution = await executionService.addReflection(userId, executionId, reflection);

      const response: IApiResponse = {
        success: true,
        message: 'Reflection added successfully',
        data: { execution },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/executions/:executionId/actions
   */
  async addAction(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { executionId } = req.params;
      const action = addActionSchema.parse(req.body);

      const execution = await executionService.addDailyAction(userId, executionId, action);

      const response: IApiResponse = {
        success: true,
        message: 'Action added successfully',
        data: { execution },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/executions/history
   */
  async getHistory(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 7;

      const executions = await executionService.getExecutionHistory(userId, days);

      const response: IApiResponse = {
        success: true,
        data: { executions },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/executions/heatmap
   */
  async getHeatmap(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 90;

      const heatmap = await executionService.getCompletionHeatmap(userId, days);

      const response: IApiResponse = {
        success: true,
        data: { heatmap },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const executionController = new ExecutionController();

