import { Types } from 'mongoose';
import { TwelveWeekPlan, ITwelveWeekPlanDocument } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler.js';
import { PlanStatus, GoalCategory, IStrategicGoal, IWeeklyGoal } from '../types/index.js';
import { userService } from './user.service.js';
import { calculate12WeekEndDate, calculateCurrentWeek, calculateDaysRemaining } from '../utils/helpers.js';

interface CreatePlanInput {
  title: string;
  visionStatement: string;
  startDate: Date;
  strategicGoals: {
    title: string;
    description: string;
    category: GoalCategory;
    priority: number;
    measurement: {
      targetValue: number;
      unit: string;
    };
  }[];
}

interface UpdatePlanInput {
  title?: string;
  visionStatement?: string;
  status?: PlanStatus;
}

export class PlanService {
  /**
   * Create a new 12-week plan
   */
  async createPlan(userId: string, input: CreatePlanInput): Promise<ITwelveWeekPlanDocument> {
    // Check for existing active plan
    const existingPlan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    if (existingPlan) {
      throw new BadRequestError('You already have an active plan. Please complete or abandon it first.');
    }

    // Validate strategic goals count
    if (input.strategicGoals.length > 5) {
      throw new BadRequestError('Cannot have more than 5 strategic goals');
    }

    const endDate = calculate12WeekEndDate(input.startDate);

    const plan = new TwelveWeekPlan({
      userId: new Types.ObjectId(userId),
      title: input.title,
      visionStatement: input.visionStatement,
      startDate: input.startDate,
      endDate,
      status: PlanStatus.DRAFT,
      strategicGoals: input.strategicGoals.map((goal) => ({
        ...goal,
        measurement: {
          ...goal.measurement,
          currentValue: 0,
        },
        isAchieved: false,
      })),
    });

    await plan.save();

    // Update user statistics
    await userService.incrementPlansCreated(userId);

    return plan;
  }

  /**
   * Get all plans for a user
   */
  async getPlans(userId: string): Promise<ITwelveWeekPlanDocument[]> {
    return TwelveWeekPlan.findPlansByUser(new Types.ObjectId(userId));
  }

  /**
   * Get active plan for a user
   */
  async getActivePlan(userId: string): Promise<ITwelveWeekPlanDocument | null> {
    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    
    if (plan) {
      // Update current week based on date
      const currentWeek = calculateCurrentWeek(plan.startDate);
      if (plan.currentWeek !== currentWeek) {
        plan.currentWeek = currentWeek;
        await plan.save();
      }
    }
    
    return plan;
  }

  /**
   * Get a specific plan
   */
  async getPlanById(userId: string, planId: string): Promise<ITwelveWeekPlanDocument> {
    const plan = await TwelveWeekPlan.findOne({
      _id: new Types.ObjectId(planId),
      userId: new Types.ObjectId(userId),
    });

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return plan;
  }

  /**
   * Update a plan
   */
  async updatePlan(
    userId: string,
    planId: string,
    updates: UpdatePlanInput
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    if (updates.title) plan.title = updates.title;
    if (updates.visionStatement) plan.visionStatement = updates.visionStatement;
    if (updates.status) {
      // Validate status transitions
      if (updates.status === PlanStatus.ACTIVE && plan.status !== PlanStatus.DRAFT) {
        throw new BadRequestError('Can only activate a draft plan');
      }
      plan.status = updates.status;
    }

    await plan.save();
    return plan;
  }

  /**
   * Delete a plan
   */
  async deletePlan(userId: string, planId: string): Promise<void> {
    const plan = await this.getPlanById(userId, planId);
    
    if (plan.status === PlanStatus.ACTIVE) {
      throw new BadRequestError('Cannot delete an active plan. Please abandon it first.');
    }

    await TwelveWeekPlan.findByIdAndDelete(planId);
  }

  /**
   * Add strategic goal to plan
   */
  async addStrategicGoal(
    userId: string,
    planId: string,
    goal: {
      title: string;
      description: string;
      category: GoalCategory;
      priority: number;
      measurement: {
        targetValue: number;
        unit: string;
      };
    }
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    if (plan.strategicGoals.length >= 5) {
      throw new BadRequestError('Cannot have more than 5 strategic goals');
    }

    plan.strategicGoals.push({
      _id: new Types.ObjectId(),
      ...goal,
      measurement: {
        ...goal.measurement,
        currentValue: 0,
      },
      isAchieved: false,
    } as IStrategicGoal);

    await plan.save();
    return plan;
  }

  /**
   * Update strategic goal
   */
  async updateStrategicGoal(
    userId: string,
    planId: string,
    goalId: string,
    updates: Partial<{
      title: string;
      description: string;
      category: GoalCategory;
      priority: number;
      currentValue: number;
      isAchieved: boolean;
    }>
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    const goal = plan.strategicGoals.find(
      (g) => g._id.toString() === goalId
    );

    if (!goal) {
      throw new NotFoundError('Strategic goal');
    }

    if (updates.title) goal.title = updates.title;
    if (updates.description) goal.description = updates.description;
    if (updates.category) goal.category = updates.category;
    if (updates.priority) goal.priority = updates.priority;
    if (updates.currentValue !== undefined) {
      goal.measurement.currentValue = updates.currentValue;
    }
    if (updates.isAchieved !== undefined) {
      goal.isAchieved = updates.isAchieved;
      if (updates.isAchieved) {
        goal.achievedAt = new Date();
      }
    }

    await plan.save();
    return plan;
  }

  /**
   * Delete strategic goal
   */
  async deleteStrategicGoal(
    userId: string,
    planId: string,
    goalId: string
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    const goalIndex = plan.strategicGoals.findIndex(
      (g) => g._id.toString() === goalId
    );

    if (goalIndex === -1) {
      throw new NotFoundError('Strategic goal');
    }

    plan.strategicGoals.splice(goalIndex, 1);

    // Also remove related weekly goals
    plan.weeklyGoals = plan.weeklyGoals.filter(
      (wg) => wg.strategicGoalId.toString() !== goalId
    );

    await plan.save();
    return plan;
  }

  /**
   * Add weekly goal
   */
  async addWeeklyGoal(
    userId: string,
    planId: string,
    weeklyGoal: {
      strategicGoalId: string;
      weekNumber: number;
      description: string;
    }
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    // Verify strategic goal exists
    const strategicGoal = plan.strategicGoals.find(
      (g) => g._id.toString() === weeklyGoal.strategicGoalId
    );

    if (!strategicGoal) {
      throw new NotFoundError('Strategic goal');
    }

    if (weeklyGoal.weekNumber < 1 || weeklyGoal.weekNumber > 12) {
      throw new BadRequestError('Week number must be between 1 and 12');
    }

    plan.weeklyGoals.push({
      _id: new Types.ObjectId(),
      strategicGoalId: new Types.ObjectId(weeklyGoal.strategicGoalId),
      weekNumber: weeklyGoal.weekNumber,
      description: weeklyGoal.description,
      isCompleted: false,
    } as IWeeklyGoal);

    await plan.save();
    return plan;
  }

  /**
   * Update weekly goal
   */
  async updateWeeklyGoal(
    userId: string,
    planId: string,
    goalId: string,
    updates: Partial<{
      description: string;
      isCompleted: boolean;
    }>
  ): Promise<ITwelveWeekPlanDocument> {
    const plan = await this.getPlanById(userId, planId);

    const goal = plan.weeklyGoals.find(
      (g) => g._id.toString() === goalId
    );

    if (!goal) {
      throw new NotFoundError('Weekly goal');
    }

    if (updates.description) goal.description = updates.description;
    if (updates.isCompleted !== undefined) {
      goal.isCompleted = updates.isCompleted;
      if (updates.isCompleted) {
        goal.completedAt = new Date();
      }
    }

    // Update goal completion rate
    const completedGoals = plan.weeklyGoals.filter((g) => g.isCompleted).length;
    plan.executionMetrics.goalCompletionRate = 
      plan.weeklyGoals.length > 0 
        ? Math.round((completedGoals / plan.weeklyGoals.length) * 100) 
        : 0;

    await plan.save();
    return plan;
  }

  /**
   * Get plan progress/scorecard
   */
  async getPlanProgress(userId: string, planId: string): Promise<{
    currentWeek: number;
    daysRemaining: number;
    strategicGoalsProgress: {
      total: number;
      achieved: number;
      progressPercentage: number;
    };
    weeklyGoalsProgress: {
      total: number;
      completed: number;
      progressPercentage: number;
    };
    executionMetrics: {
      overallScore: number;
      weeklyScores: number[];
      habitCompletionRate: number;
      goalCompletionRate: number;
    };
  }> {
    const plan = await this.getPlanById(userId, planId);

    const currentWeek = calculateCurrentWeek(plan.startDate);
    const daysRemaining = calculateDaysRemaining(plan.endDate);

    const achievedStrategicGoals = plan.strategicGoals.filter((g) => g.isAchieved).length;
    const completedWeeklyGoals = plan.weeklyGoals.filter((g) => g.isCompleted).length;

    return {
      currentWeek,
      daysRemaining,
      strategicGoalsProgress: {
        total: plan.strategicGoals.length,
        achieved: achievedStrategicGoals,
        progressPercentage:
          plan.strategicGoals.length > 0
            ? Math.round((achievedStrategicGoals / plan.strategicGoals.length) * 100)
            : 0,
      },
      weeklyGoalsProgress: {
        total: plan.weeklyGoals.length,
        completed: completedWeeklyGoals,
        progressPercentage:
          plan.weeklyGoals.length > 0
            ? Math.round((completedWeeklyGoals / plan.weeklyGoals.length) * 100)
            : 0,
      },
      executionMetrics: plan.executionMetrics,
    };
  }

  /**
   * Activate a plan
   */
  async activatePlan(userId: string, planId: string): Promise<ITwelveWeekPlanDocument> {
    // Check for existing active plan
    const existingActive = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    if (existingActive && existingActive._id.toString() !== planId) {
      throw new BadRequestError('You already have an active plan');
    }

    return this.updatePlan(userId, planId, { status: PlanStatus.ACTIVE });
  }

  /**
   * Complete a plan
   */
  async completePlan(userId: string, planId: string): Promise<ITwelveWeekPlanDocument> {
    return this.updatePlan(userId, planId, { status: PlanStatus.COMPLETED });
  }

  /**
   * Abandon a plan
   */
  async abandonPlan(userId: string, planId: string): Promise<ITwelveWeekPlanDocument> {
    return this.updatePlan(userId, planId, { status: PlanStatus.ABANDONED });
  }
}

export const planService = new PlanService();

