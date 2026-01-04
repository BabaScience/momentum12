import { Types } from 'mongoose';
import { Habit, IHabitDocument, DailyExecution } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler.js';
import { FrequencyType, IHabitFrequency, IHabitReminders, IHabitAppearance } from '../types/index.js';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface CreateHabitInput {
  name: string;
  description?: string;
  planId?: string;
  frequency: IHabitFrequency;
  reminders?: IHabitReminders;
  appearance?: IHabitAppearance;
  targetStreak?: number;
}

interface UpdateHabitInput {
  name?: string;
  description?: string;
  frequency?: IHabitFrequency;
  reminders?: IHabitReminders;
  appearance?: IHabitAppearance;
  targetStreak?: number;
  isActive?: boolean;
}

export class HabitService {
  /**
   * Create a new habit
   */
  async createHabit(userId: string, input: CreateHabitInput): Promise<IHabitDocument> {
    const habit = new Habit({
      userId: new Types.ObjectId(userId),
      planId: input.planId ? new Types.ObjectId(input.planId) : undefined,
      name: input.name,
      description: input.description,
      frequency: input.frequency || { type: FrequencyType.DAILY },
      reminders: input.reminders || {
        enabled: false,
        times: [],
        sound: 'default',
      },
      appearance: input.appearance || {
        iconName: 'check-circle',
        colorHex: '#2196F3',
      },
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        targetStreak: input.targetStreak || 30,
      },
    });

    await habit.save();
    return habit;
  }

  /**
   * Get all habits for a user
   */
  async getHabits(userId: string, activeOnly: boolean = true): Promise<IHabitDocument[]> {
    if (activeOnly) {
      return Habit.findActiveByUser(new Types.ObjectId(userId));
    }
    return Habit.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  /**
   * Get habits for a specific plan
   */
  async getHabitsByPlan(planId: string): Promise<IHabitDocument[]> {
    return Habit.findByPlan(new Types.ObjectId(planId));
  }

  /**
   * Get a specific habit
   */
  async getHabitById(userId: string, habitId: string): Promise<IHabitDocument> {
    const habit = await Habit.findOne({
      _id: new Types.ObjectId(habitId),
      userId: new Types.ObjectId(userId),
    });

    if (!habit) {
      throw new NotFoundError('Habit');
    }

    return habit;
  }

  /**
   * Update a habit
   */
  async updateHabit(
    userId: string,
    habitId: string,
    updates: UpdateHabitInput
  ): Promise<IHabitDocument> {
    const habit = await this.getHabitById(userId, habitId);

    if (updates.name) habit.name = updates.name;
    if (updates.description !== undefined) habit.description = updates.description;
    if (updates.frequency) habit.frequency = updates.frequency;
    if (updates.reminders) habit.reminders = { ...habit.reminders, ...updates.reminders };
    if (updates.appearance) habit.appearance = { ...habit.appearance, ...updates.appearance };
    if (updates.targetStreak) habit.streakData.targetStreak = updates.targetStreak;
    if (updates.isActive !== undefined) habit.isActive = updates.isActive;

    await habit.save();
    return habit;
  }

  /**
   * Delete a habit
   */
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    const habit = await this.getHabitById(userId, habitId);
    await Habit.findByIdAndDelete(habitId);
  }

  /**
   * Archive a habit (soft delete)
   */
  async archiveHabit(userId: string, habitId: string): Promise<IHabitDocument> {
    return this.updateHabit(userId, habitId, { isActive: false });
  }

  /**
   * Get habit statistics
   */
  async getHabitStatistics(userId: string, habitId: string): Promise<{
    totalCompletions: number;
    averageTimeSpent: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    targetStreak: number;
    lastCompleted: Date | null;
    weeklyCompletions: { date: string; completed: boolean }[];
  }> {
    const habit = await this.getHabitById(userId, habitId);

    // Get last 7 days of completions
    const endDate = new Date();
    const startDate = subDays(endDate, 6);

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startOfDay(startDate),
      endOfDay(endDate)
    );

    const weeklyCompletions: { date: string; completed: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(endDate, 6 - i);
      const dateStr = date.toISOString().split('T')[0];
      const execution = executions.find((e) => {
        const execDate = new Date(e.executionDate).toISOString().split('T')[0];
        return execDate === dateStr;
      });

      const habitExec = execution?.habitExecutions.find(
        (h) => h.habitId.toString() === habitId
      );

      weeklyCompletions.push({
        date: dateStr,
        completed: habitExec?.isCompleted || false,
      });
    }

    return {
      totalCompletions: habit.statistics.totalCompletions,
      averageTimeSpent: habit.statistics.averageTimeSpent,
      completionRate: habit.statistics.completionRate,
      currentStreak: habit.streakData.currentStreak,
      longestStreak: habit.streakData.longestStreak,
      targetStreak: habit.streakData.targetStreak,
      lastCompleted: habit.streakData.lastCompletedDate || null,
      weeklyCompletions,
    };
  }

  /**
   * Get habit history (completion history)
   */
  async getHabitHistory(
    userId: string,
    habitId: string,
    days: number = 30
  ): Promise<{
    date: string;
    completed: boolean;
    timeSpent?: number;
    notes?: string;
  }[]> {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const executions = await DailyExecution.findByUserDateRange(
      new Types.ObjectId(userId),
      startOfDay(startDate),
      endOfDay(endDate)
    );

    const history: {
      date: string;
      completed: boolean;
      timeSpent?: number;
      notes?: string;
    }[] = [];

    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dateStr = date.toISOString().split('T')[0];
      const execution = executions.find((e) => {
        const execDate = new Date(e.executionDate).toISOString().split('T')[0];
        return execDate === dateStr;
      });

      const habitExec = execution?.habitExecutions.find(
        (h) => h.habitId.toString() === habitId
      );

      history.push({
        date: dateStr,
        completed: habitExec?.isCompleted || false,
        timeSpent: habitExec?.timeSpentMinutes,
        notes: habitExec?.notes,
      });
    }

    return history;
  }

  /**
   * Update habit streak
   */
  async updateStreak(
    userId: string,
    habitId: string,
    completed: boolean,
    executionDate?: Date
  ): Promise<IHabitDocument> {
    const habit = await this.getHabitById(userId, habitId);
    await habit.updateStreak(completed, executionDate);
    return habit;
  }

  /**
   * Increment completions count
   */
  async incrementCompletions(
    userId: string,
    habitId: string,
    timeSpent?: number
  ): Promise<void> {
    const habit = await this.getHabitById(userId, habitId);
    await habit.incrementCompletions(timeSpent);
  }

  /**
   * Check if habit should be tracked today
   */
  shouldTrackToday(habit: IHabitDocument): boolean {
    const today = new Date().getDay(); // 0-6, Sunday-Saturday

    if (habit.frequency.type === FrequencyType.DAILY) {
      return true;
    }

    if (habit.frequency.type === FrequencyType.WEEKLY && habit.frequency.daysOfWeek) {
      return habit.frequency.daysOfWeek.includes(today);
    }

    if (habit.frequency.type === FrequencyType.CUSTOM && habit.frequency.timesPerWeek) {
      // For custom frequency, always allow tracking
      return true;
    }

    return true;
  }

  /**
   * Get habits to track today
   */
  async getHabitsForToday(userId: string): Promise<IHabitDocument[]> {
    const habits = await this.getHabits(userId, true);
    return habits.filter((habit) => this.shouldTrackToday(habit));
  }
}

export const habitService = new HabitService();

