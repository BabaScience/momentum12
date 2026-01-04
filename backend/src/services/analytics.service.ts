import { Types } from 'mongoose';
import { DailyExecution, TwelveWeekPlan, Habit, User } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { 
  IDashboardData, 
  IWeeklyTrend, 
  IHabitPerformance, 
  IGoalProgress,
  HabitTrend,
  GoalCategory,
} from '../types/index.js';
import { startOfDay, endOfDay, subDays, subWeeks, format, differenceInDays } from 'date-fns';
import { calculateCurrentWeek, calculateDaysRemaining } from '../utils/helpers.js';

export class AnalyticsService {
  /**
   * Get dashboard data
   */
  async getDashboard(userId: string): Promise<IDashboardData> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get active plan
    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));

    // Get streak data
    const last30Days = await this.getStreakHistory(userId, 30);

    // Get weekly trend
    const weeklyTrend = await this.getWeeklyTrend(userId, 12);

    // Get habit performance
    const habitPerformance = await this.getHabitPerformance(userId);

    // Get goal progress
    const goalProgress = plan ? await this.getGoalProgress(userId, plan._id.toString()) : [];

    return {
      currentPlan: plan ? {
        id: plan._id.toString(),
        title: plan.title,
        currentWeek: calculateCurrentWeek(plan.startDate),
        daysRemaining: calculateDaysRemaining(plan.endDate),
        overallScore: plan.executionMetrics.overallScore,
      } : null,
      streakData: {
        currentStreak: user.statistics.currentStreak,
        longestStreak: user.statistics.longestStreak,
        streakHistory: last30Days,
      },
      weeklyTrend,
      habitPerformance,
      goalProgress,
    };
  }

  /**
   * Get streak history for past N days
   */
  async getStreakHistory(
    userId: string,
    days: number
  ): Promise<{ date: string; maintained: boolean }[]> {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    const history: { date: string; maintained: boolean }[] = [];

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const execution = executions.find((e) => {
        const execDate = format(e.executionDate, 'yyyy-MM-dd');
        return execDate === dateStr;
      });

      history.push({
        date: dateStr,
        maintained: execution ? execution.scorecard.overallScore >= 85 : false,
      });
    }

    return history;
  }

  /**
   * Get weekly trend for past N weeks
   */
  async getWeeklyTrend(userId: string, weeks: number): Promise<IWeeklyTrend[]> {
    const trends: IWeeklyTrend[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfDay(subWeeks(new Date(), i));
      const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));

      const executions = await DailyExecution.findByUserDateRange(
        new Types.ObjectId(userId),
        weekStart,
        weekEnd
      );

      let totalScore = 0;
      let habitsCompleted = 0;
      let goalsCompleted = 0;

      executions.forEach((exec) => {
        totalScore += exec.scorecard.overallScore;
        habitsCompleted += exec.habitExecutions.filter((h) => h.isCompleted).length;
        goalsCompleted += exec.dailyActions.filter((a) => a.isCompleted).length;
      });

      trends.push({
        weekNumber: weeks - i,
        score: executions.length > 0 ? Math.round(totalScore / executions.length) : 0,
        habitsCompleted,
        goalsCompleted,
      });
    }

    return trends;
  }

  /**
   * Get habit performance data
   */
  async getHabitPerformance(userId: string): Promise<IHabitPerformance[]> {
    const habits = await Habit.findActiveByUser(new Types.ObjectId(userId));

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), 30));

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    return habits.map((habit) => {
      // Count completions in last 30 days
      let completions = 0;
      let totalTracked = 0;

      executions.forEach((exec) => {
        const habitExec = exec.habitExecutions.find(
          (h) => h.habitId.toString() === habit._id.toString()
        );
        if (habitExec) {
          totalTracked++;
          if (habitExec.isCompleted) {
            completions++;
          }
        }
      });

      // Calculate trend based on recent vs older performance
      const recent = executions.slice(-7);
      const older = executions.slice(0, 7);

      let recentRate = 0;
      let olderRate = 0;

      recent.forEach((exec) => {
        const he = exec.habitExecutions.find(
          (h) => h.habitId.toString() === habit._id.toString()
        );
        if (he?.isCompleted) recentRate++;
      });

      older.forEach((exec) => {
        const he = exec.habitExecutions.find(
          (h) => h.habitId.toString() === habit._id.toString()
        );
        if (he?.isCompleted) olderRate++;
      });

      let trend: HabitTrend = HabitTrend.STABLE;
      if (recentRate > olderRate + 1) {
        trend = HabitTrend.IMPROVING;
      } else if (recentRate < olderRate - 1) {
        trend = HabitTrend.DECLINING;
      }

      return {
        habitId: habit._id.toString(),
        habitName: habit.name,
        completionRate: totalTracked > 0 ? Math.round((completions / totalTracked) * 100) : 0,
        currentStreak: habit.streakData.currentStreak,
        trend,
      };
    });
  }

  /**
   * Get goal progress for a plan
   */
  async getGoalProgress(userId: string, planId: string): Promise<IGoalProgress[]> {
    const plan = await TwelveWeekPlan.findOne({
      _id: new Types.ObjectId(planId),
      userId: new Types.ObjectId(userId),
    });

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return plan.strategicGoals.map((goal) => {
      const progressPercentage = goal.measurement.targetValue > 0
        ? Math.round((goal.measurement.currentValue / goal.measurement.targetValue) * 100)
        : 0;

      // Determine if on track based on week and progress
      const currentWeek = calculateCurrentWeek(plan.startDate);
      const expectedProgress = (currentWeek / 12) * 100;
      const isOnTrack = progressPercentage >= expectedProgress * 0.85;

      return {
        goalId: goal._id.toString(),
        title: goal.title,
        category: goal.category,
        progressPercentage: Math.min(progressPercentage, 100),
        isOnTrack,
      };
    });
  }

  /**
   * Get weekly report
   */
  async getWeeklyReport(
    userId: string,
    weekNumber: number
  ): Promise<{
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    executionScore: number;
    habitsData: {
      total: number;
      completed: number;
      rate: number;
    };
    goalsData: {
      total: number;
      completed: number;
      rate: number;
    };
    topHabits: { name: string; completions: number }[];
    insights: string[];
  }> {
    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    
    if (!plan) {
      throw new NotFoundError('Active plan');
    }

    // Calculate week dates
    const planStart = startOfDay(plan.startDate);
    const weekStart = new Date(planStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      weekStart,
      weekEnd
    );

    // Calculate metrics
    let totalScore = 0;
    let habitsCompleted = 0;
    let habitsTotal = 0;
    let actionsCompleted = 0;
    let actionsTotal = 0;

    const habitCompletions: Record<string, { name: string; count: number }> = {};

    const habits = await Habit.findActiveByUser(new Types.ObjectId(userId));
    habits.forEach((h) => {
      habitCompletions[h._id.toString()] = { name: h.name, count: 0 };
    });

    executions.forEach((exec) => {
      totalScore += exec.scorecard.overallScore;
      
      exec.habitExecutions.forEach((he) => {
        habitsTotal++;
        if (he.isCompleted) {
          habitsCompleted++;
          const id = he.habitId.toString();
          if (habitCompletions[id]) {
            habitCompletions[id].count++;
          }
        }
      });

      exec.dailyActions.forEach((da) => {
        actionsTotal++;
        if (da.isCompleted) {
          actionsCompleted++;
        }
      });
    });

    // Get top habits
    const topHabits = Object.values(habitCompletions)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((h) => ({ name: h.name, completions: h.count }));

    // Generate insights
    const insights: string[] = [];
    const avgScore = executions.length > 0 ? Math.round(totalScore / executions.length) : 0;

    if (avgScore >= 85) {
      insights.push('Excellent week! You maintained high execution standards.');
    } else if (avgScore >= 70) {
      insights.push('Good progress this week. A few more completions would put you in the green zone.');
    } else {
      insights.push('Room for improvement. Focus on consistency to build momentum.');
    }

    const habitsRate = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;
    if (habitsRate < 70) {
      insights.push('Consider reducing the number of habits to improve focus.');
    }

    return {
      weekNumber,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      executionScore: avgScore,
      habitsData: {
        total: habitsTotal,
        completed: habitsCompleted,
        rate: habitsRate,
      },
      goalsData: {
        total: actionsTotal,
        completed: actionsCompleted,
        rate: actionsTotal > 0 ? Math.round((actionsCompleted / actionsTotal) * 100) : 0,
      },
      topHabits,
      insights,
    };
  }

  /**
   * Get trends for a specific time range
   */
  async getTrends(
    userId: string,
    range: 'week' | 'month' | '12weeks'
  ): Promise<{
    scores: { date: string; score: number }[];
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    totalDaysTracked: number;
    streakDays: number;
  }> {
    let days: number;
    switch (range) {
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      case '12weeks':
        days = 84;
        break;
      default:
        days = 30;
    }

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    const scores: { date: string; score: number }[] = [];
    let totalScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const execution = executions.find((e) => {
        const execDate = format(e.executionDate, 'yyyy-MM-dd');
        return execDate === dateStr;
      });

      const score = execution?.scorecard.overallScore || 0;
      scores.push({ date: dateStr, score });

      if (execution) {
        totalScore += score;
        if (score > highestScore) highestScore = score;
        if (score < lowestScore) lowestScore = score;

        if (score >= 85) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak from today
    for (let i = scores.length - 1; i >= 0; i--) {
      if (scores[i].score >= 85) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      scores,
      averageScore: executions.length > 0 ? Math.round(totalScore / executions.length) : 0,
      highestScore: executions.length > 0 ? highestScore : 0,
      lowestScore: executions.length > 0 ? lowestScore : 0,
      totalDaysTracked: executions.length,
      streakDays: Math.max(currentStreak, maxStreak),
    };
  }
}

export const analyticsService = new AnalyticsService();

