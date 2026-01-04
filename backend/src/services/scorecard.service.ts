import { Types } from 'mongoose';
import { DailyExecution, TwelveWeekPlan, User } from '../models/index.js';
import { IWeeklyGoal, IHabitExecution } from '../types/index.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

/**
 * Weekly Execution Score Calculation
 * Based on 12 Week Year methodology
 */
export class ScorecardCalculator {
  /**
   * Calculate weekly execution score
   * Formula: (Completed Actions / Total Required Actions) × 100
   * Weighted: 40% goals, 60% habits
   */
  calculateWeeklyScore(
    weeklyGoals: { isCompleted: boolean }[],
    habitExecutions: { isCompleted: boolean }[],
    daysInWeek: number = 7
  ): number {
    // Calculate goal completion score (40% weight)
    const goalScore = this.calculateGoalCompletionScore(weeklyGoals);
    
    // Calculate habit adherence score (60% weight)
    const habitScore = this.calculateHabitAdherenceScore(habitExecutions, daysInWeek);
    
    // Weighted average
    const overallScore = (goalScore * 0.4) + (habitScore * 0.6);
    
    return Math.round(overallScore * 100) / 100;
  }

  /**
   * Calculate goal completion score
   */
  private calculateGoalCompletionScore(weeklyGoals: { isCompleted: boolean }[]): number {
    if (weeklyGoals.length === 0) return 100;
    
    const completedGoals = weeklyGoals.filter(g => g.isCompleted).length;
    return (completedGoals / weeklyGoals.length) * 100;
  }

  /**
   * Calculate habit adherence score
   */
  private calculateHabitAdherenceScore(
    habitExecutions: { isCompleted: boolean }[],
    daysInWeek: number
  ): number {
    if (habitExecutions.length === 0) return 100;
    
    const completedHabits = habitExecutions.filter(h => h.isCompleted).length;
    return (completedHabits / habitExecutions.length) * 100;
  }

  /**
   * Calculate 12-week execution score
   * This is the cumulative average of all weekly scores
   */
  calculate12WeekScore(weeklyScores: number[]): number {
    if (weeklyScores.length === 0) return 0;
    
    const sum = weeklyScores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / weeklyScores.length) * 100) / 100;
  }

  /**
   * Determine if user is "on track" for goal achievement
   * On track = maintaining ≥85% execution score
   */
  isOnTrack(executionScore: number): boolean {
    return executionScore >= 85;
  }

  /**
   * Calculate execution score grade
   */
  getScoreGrade(score: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    label: string;
    color: string;
  } {
    if (score >= 90) {
      return { grade: 'A', label: 'Excellent', color: '#4CAF50' };
    } else if (score >= 80) {
      return { grade: 'B', label: 'Good', color: '#8BC34A' };
    } else if (score >= 70) {
      return { grade: 'C', label: 'Fair', color: '#FF9800' };
    } else if (score >= 60) {
      return { grade: 'D', label: 'Needs Improvement', color: '#FF5722' };
    } else {
      return { grade: 'F', label: 'Critical', color: '#F44336' };
    }
  }

  /**
   * Calculate weekly scorecard for a plan
   */
  async calculateWeeklyScorecard(
    userId: string,
    planId: string,
    weekNumber: number
  ): Promise<{
    weekNumber: number;
    executionScore: number;
    habitsCompletionRate: number;
    goalsCompletionRate: number;
    grade: { grade: string; label: string; color: string };
    isOnTrack: boolean;
  }> {
    const plan = await TwelveWeekPlan.findOne({
      _id: new Types.ObjectId(planId),
      userId: new Types.ObjectId(userId),
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate week dates
    const planStart = startOfDay(plan.startDate);
    const weekStart = new Date(planStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    // Get executions for the week
    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      weekStart,
      weekEnd
    );

    // Get weekly goals for this week
    const weeklyGoals = plan.weeklyGoals.filter(g => g.weekNumber === weekNumber);

    // Aggregate habit executions
    const allHabitExecutions: { isCompleted: boolean }[] = [];
    executions.forEach(exec => {
      exec.habitExecutions.forEach(he => {
        allHabitExecutions.push({ isCompleted: he.isCompleted });
      });
    });

    // Calculate scores
    const habitsCompletionRate = allHabitExecutions.length > 0
      ? Math.round((allHabitExecutions.filter(h => h.isCompleted).length / allHabitExecutions.length) * 100)
      : 0;

    const goalsCompletionRate = weeklyGoals.length > 0
      ? Math.round((weeklyGoals.filter(g => g.isCompleted).length / weeklyGoals.length) * 100)
      : 0;

    const executionScore = this.calculateWeeklyScore(
      weeklyGoals,
      allHabitExecutions,
      executions.length
    );

    return {
      weekNumber,
      executionScore,
      habitsCompletionRate,
      goalsCompletionRate,
      grade: this.getScoreGrade(executionScore),
      isOnTrack: this.isOnTrack(executionScore),
    };
  }

  /**
   * Update plan execution metrics
   */
  async updatePlanMetrics(userId: string, planId: string): Promise<void> {
    const plan = await TwelveWeekPlan.findOne({
      _id: new Types.ObjectId(planId),
      userId: new Types.ObjectId(userId),
    });

    if (!plan) return;

    // Calculate scorecards for each completed week
    const weeklyScores: number[] = [];
    for (let week = 1; week <= plan.currentWeek; week++) {
      const scorecard = await this.calculateWeeklyScorecard(userId, planId, week);
      weeklyScores.push(scorecard.executionScore);
    }

    // Update plan metrics
    plan.executionMetrics.weeklyScores = weeklyScores;
    plan.executionMetrics.overallScore = this.calculate12WeekScore(weeklyScores);

    // Calculate habit completion rate
    const endDate = new Date();
    const startDate = startOfDay(plan.startDate);
    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startDate,
      endDate
    );

    let totalHabits = 0;
    let completedHabits = 0;
    executions.forEach(exec => {
      totalHabits += exec.habitExecutions.length;
      completedHabits += exec.habitExecutions.filter(h => h.isCompleted).length;
    });

    plan.executionMetrics.habitCompletionRate = totalHabits > 0
      ? Math.round((completedHabits / totalHabits) * 100)
      : 0;

    // Calculate goal completion rate
    const completedGoals = plan.weeklyGoals.filter(g => g.isCompleted).length;
    plan.executionMetrics.goalCompletionRate = plan.weeklyGoals.length > 0
      ? Math.round((completedGoals / plan.weeklyGoals.length) * 100)
      : 0;

    await plan.save();
  }
}

export const scorecardCalculator = new ScorecardCalculator();

