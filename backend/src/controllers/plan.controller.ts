import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { planService } from '../services/plan.service.js';
import { IAuthRequest, IApiResponse, GoalCategory, PlanStatus } from '../types/index.js';

const createPlanSchema = z.object({
  title: z.string().min(3).max(100),
  visionStatement: z.string().min(20).max(1000),
  startDate: z.string().transform((str) => new Date(str)),
  strategicGoals: z.array(z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(1000),
    category: z.nativeEnum(GoalCategory),
    priority: z.number().min(1).max(5),
    measurement: z.object({
      targetValue: z.number().min(0),
      unit: z.string().max(50),
    }),
  })).max(5),
});

const updatePlanSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  visionStatement: z.string().min(20).max(1000).optional(),
  status: z.nativeEnum(PlanStatus).optional(),
});

const strategicGoalSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000),
  category: z.nativeEnum(GoalCategory),
  priority: z.number().min(1).max(5),
  measurement: z.object({
    targetValue: z.number().min(0),
    unit: z.string().max(50),
  }),
});

const updateStrategicGoalSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(GoalCategory).optional(),
  priority: z.number().min(1).max(5).optional(),
  currentValue: z.number().min(0).optional(),
  isAchieved: z.boolean().optional(),
});

const weeklyGoalSchema = z.object({
  strategicGoalId: z.string(),
  weekNumber: z.number().min(1).max(12),
  description: z.string().max(500),
});

const updateWeeklyGoalSchema = z.object({
  description: z.string().max(500).optional(),
  isCompleted: z.boolean().optional(),
});

export class PlanController {
  /**
   * POST /api/v1/plans
   */
  async createPlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input = createPlanSchema.parse(req.body);

      const plan = await planService.createPlan(userId, input);

      const response: IApiResponse = {
        success: true,
        message: 'Plan created successfully',
        data: { plan },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans
   */
  async getPlans(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const plans = await planService.getPlans(userId);

      const response: IApiResponse = {
        success: true,
        data: { plans },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/active
   */
  async getActivePlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const plan = await planService.getActivePlan(userId);

      const response: IApiResponse = {
        success: true,
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/:planId
   */
  async getPlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;

      const plan = await planService.getPlanById(userId, planId);

      const response: IApiResponse = {
        success: true,
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/plans/:planId
   */
  async updatePlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;
      const updates = updatePlanSchema.parse(req.body);

      const plan = await planService.updatePlan(userId, planId, updates);

      const response: IApiResponse = {
        success: true,
        message: 'Plan updated successfully',
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/plans/:planId
   */
  async deletePlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;

      await planService.deletePlan(userId, planId);

      const response: IApiResponse = {
        success: true,
        message: 'Plan deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/plans/:planId/activate
   */
  async activatePlan(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;

      const plan = await planService.activatePlan(userId, planId);

      const response: IApiResponse = {
        success: true,
        message: 'Plan activated successfully',
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/plans/:planId/strategic-goals
   */
  async addStrategicGoal(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;
      const goal = strategicGoalSchema.parse(req.body);

      const plan = await planService.addStrategicGoal(userId, planId, goal);

      const response: IApiResponse = {
        success: true,
        message: 'Strategic goal added successfully',
        data: { plan },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/plans/:planId/strategic-goals/:goalId
   */
  async updateStrategicGoal(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId, goalId } = req.params;
      const updates = updateStrategicGoalSchema.parse(req.body);

      const plan = await planService.updateStrategicGoal(userId, planId, goalId, updates);

      const response: IApiResponse = {
        success: true,
        message: 'Strategic goal updated successfully',
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/plans/:planId/strategic-goals/:goalId
   */
  async deleteStrategicGoal(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId, goalId } = req.params;

      const plan = await planService.deleteStrategicGoal(userId, planId, goalId);

      const response: IApiResponse = {
        success: true,
        message: 'Strategic goal deleted successfully',
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/plans/:planId/weekly-goals
   */
  async addWeeklyGoal(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;
      const goal = weeklyGoalSchema.parse(req.body);

      const plan = await planService.addWeeklyGoal(userId, planId, goal);

      const response: IApiResponse = {
        success: true,
        message: 'Weekly goal added successfully',
        data: { plan },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/plans/:planId/weekly-goals/:goalId
   */
  async updateWeeklyGoal(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId, goalId } = req.params;
      const updates = updateWeeklyGoalSchema.parse(req.body);

      const plan = await planService.updateWeeklyGoal(userId, planId, goalId, updates);

      const response: IApiResponse = {
        success: true,
        message: 'Weekly goal updated successfully',
        data: { plan },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/:planId/progress
   */
  async getPlanProgress(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { planId } = req.params;

      const progress = await planService.getPlanProgress(userId, planId);

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

export const planController = new PlanController();

