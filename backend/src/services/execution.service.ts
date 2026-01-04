import { Types } from 'mongoose';
import { DailyExecution, IDailyExecutionDocument, Habit, TwelveWeekPlan } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler.js';
import { IReflection, IHabitExecution, IDailyAction } from '../types/index.js';
import { habitService } from './habit.service.js';
import { userService } from './user.service.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export class ExecutionService {
  /**
   * Get or create today's execution
   */
  async getTodayExecution(userId: string): Promise<IDailyExecutionDocument> {
    const today = startOfDay(new Date());
    
    // Try to find existing execution
    let execution = await DailyExecution.findByUserAndDate(
      new Types.ObjectId(userId),
      today
    );

    if (!execution) {
      // Get active plan
      const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
      
      // Get habits for today
      const habits = await habitService.getHabitsForToday(userId);
      const habitIds = habits.map((h) => h._id);

      execution = await DailyExecution.getOrCreateForToday(
        new Types.ObjectId(userId),
        plan?._id || new Types.ObjectId(),
        habitIds
      );

      // Add daily actions from weekly goals if plan exists
      if (plan) {
        const currentWeek = plan.currentWeek;
        const weeklyGoals = plan.weeklyGoals.filter(
          (g) => g.weekNumber === currentWeek && !g.isCompleted
        );

        execution.dailyActions = weeklyGoals.slice(0, 3).map((goal) => ({
          _id: new Types.ObjectId(),
          weeklyGoalId: goal._id,
          description: goal.description,
          isCompleted: false,
        })) as IDailyAction[];

        await execution.save();
      }
    }

    return execution;
  }

  /**
   * Get execution by date
   */
  async getExecutionByDate(userId: string, date: Date): Promise<IDailyExecutionDocument | null> {
    return DailyExecution.findByUserAndDate(new Types.ObjectId(userId), date);
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(userId: string, executionId: string): Promise<IDailyExecutionDocument> {
    const execution = await DailyExecution.findOne({
      _id: new Types.ObjectId(executionId),
      userId: new Types.ObjectId(userId),
    });

    if (!execution) {
      throw new NotFoundError('Execution');
    }

    return execution;
  }

  /**
   * Complete a habit in execution
   */
  async completeHabit(
    userId: string,
    executionId: string,
    habitId: string,
    timeSpent?: number,
    notes?: string
  ): Promise<IDailyExecutionDocument> {
    const execution = await this.getExecutionById(userId, executionId);
    
    const success = execution.completeHabit(
      new Types.ObjectId(habitId),
      timeSpent,
      notes
    );

    if (!success) {
      throw new NotFoundError('Habit in execution');
    }

    await execution.save();

    // Update habit streak and statistics
    await habitService.updateStreak(userId, habitId, true, execution.executionDate);
    await habitService.incrementCompletions(userId, habitId, timeSpent);
    
    // Update user statistics
    await userService.incrementHabitsCompleted(userId);

    return execution;
  }

  /**
   * Uncomplete a habit in execution
   */
  async uncompleteHabit(
    userId: string,
    executionId: string,
    habitId: string
  ): Promise<IDailyExecutionDocument> {
    const execution = await this.getExecutionById(userId, executionId);
    
    const success = execution.uncompleteHabit(new Types.ObjectId(habitId));

    if (!success) {
      throw new NotFoundError('Habit in execution');
    }

    await execution.save();

    // Note: We don't decrement streak on uncomplete to prevent gaming

    return execution;
  }

  /**
   * Complete an action in execution
   */
  async completeAction(
    userId: string,
    executionId: string,
    actionId: string
  ): Promise<IDailyExecutionDocument> {
    const execution = await this.getExecutionById(userId, executionId);
    
    const success = execution.completeAction(new Types.ObjectId(actionId));

    if (!success) {
      throw new NotFoundError('Action in execution');
    }

    await execution.save();
    return execution;
  }

  /**
   * Add reflection to execution
   */
  async addReflection(
    userId: string,
    executionId: string,
    reflection: IReflection
  ): Promise<IDailyExecutionDocument> {
    const execution = await this.getExecutionById(userId, executionId);
    
    execution.reflection = reflection;
    await execution.save();

    return execution;
  }

  /**
   * Add daily action
   */
  async addDailyAction(
    userId: string,
    executionId: string,
    action: {
      weeklyGoalId: string;
      description: string;
    }
  ): Promise<IDailyExecutionDocument> {
    const execution = await this.getExecutionById(userId, executionId);

    execution.dailyActions.push({
      _id: new Types.ObjectId(),
      weeklyGoalId: new Types.ObjectId(action.weeklyGoalId),
      description: action.description,
      isCompleted: false,
    } as IDailyAction);

    execution.calculateScorecard();
    await execution.save();

    return execution;
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(
    userId: string,
    days: number = 7
  ): Promise<IDailyExecutionDocument[]> {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days - 1));

    return DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(
    userId: string,
    weekStartDate: Date
  ): Promise<{
    weekStart: string;
    weekEnd: string;
    daysTracked: number;
    averageScore: number;
    habitsCompleted: number;
    habitsTotal: number;
    actionsCompleted: number;
    actionsTotal: number;
    dailyScores: { date: string; score: number }[];
  }> {
    const startDate = startOfDay(weekStartDate);
    const endDate = endOfDay(new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000));

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    let habitsCompleted = 0;
    let habitsTotal = 0;
    let actionsCompleted = 0;
    let actionsTotal = 0;
    let totalScore = 0;

    const dailyScores: { date: string; score: number }[] = [];

    executions.forEach((exec) => {
      habitsCompleted += exec.habitExecutions.filter((h) => h.isCompleted).length;
      habitsTotal += exec.habitExecutions.length;
      actionsCompleted += exec.dailyActions.filter((a) => a.isCompleted).length;
      actionsTotal += exec.dailyActions.length;
      totalScore += exec.scorecard.overallScore;

      dailyScores.push({
        date: format(exec.executionDate, 'yyyy-MM-dd'),
        score: exec.scorecard.overallScore,
      });
    });

    return {
      weekStart: format(startDate, 'yyyy-MM-dd'),
      weekEnd: format(endDate, 'yyyy-MM-dd'),
      daysTracked: executions.length,
      averageScore: executions.length > 0 ? Math.round(totalScore / executions.length) : 0,
      habitsCompleted,
      habitsTotal,
      actionsCompleted,
      actionsTotal,
      dailyScores,
    };
  }

  /**
   * Get completion heatmap data
   */
  async getCompletionHeatmap(
    userId: string,
    days: number = 90
  ): Promise<{ date: string; score: number; completed: boolean }[]> {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    const heatmapData: { date: string; score: number; completed: boolean }[] = [];

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const execution = executions.find((e) => {
        const execDate = format(e.executionDate, 'yyyy-MM-dd');
        return execDate === dateStr;
      });

      heatmapData.push({
        date: dateStr,
        score: execution?.scorecard.overallScore || 0,
        completed: execution?.scorecard.overallScore >= 85,
      });
    }

    return heatmapData;
  }
}

export const executionService = new ExecutionService();

