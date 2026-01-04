import { Types } from 'mongoose';
import { DailyExecution, User, Habit } from '../models/index.js';
import { startOfDay, subDays, differenceInDays, format } from 'date-fns';

/**
 * Streak Calculation Service
 * Manages streak tracking for habits and overall user performance
 */
export class StreakService {
  /**
   * Calculate streak based on consecutive days with ≥85% execution score
   */
  async calculateUserStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 365); // Look back 1 year

    const executions = await DailyExecution.find({
      userId: new Types.ObjectId(userId),
      executionDate: { $gte: startDate, $lte: today },
    }).sort({ executionDate: -1 });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const exec of executions) {
      const execDate = startOfDay(exec.executionDate);
      
      if (exec.scorecard.overallScore >= 85) {
        if (lastDate === null) {
          // First execution we're checking
          tempStreak = 1;
        } else {
          const daysDiff = differenceInDays(lastDate, execDate);
          if (daysDiff === 1) {
            // Consecutive day
            tempStreak++;
          } else if (daysDiff > 1) {
            // Gap in days
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            tempStreak = 1;
          }
          // daysDiff === 0 shouldn't happen, skip
        }
        lastDate = execDate;
      } else {
        // Streak broken
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        
        // If this is the first execution and score is low, current streak is 0
        if (currentStreak === 0 && executions.indexOf(exec) === 0) {
          currentStreak = 0;
        }
        
        tempStreak = 0;
        lastDate = null;
      }
    }

    // Check if current streak is still active
    if (executions.length > 0) {
      const mostRecent = executions[0];
      const daysSinceLastExec = differenceInDays(today, startOfDay(mostRecent.executionDate));
      
      if (daysSinceLastExec <= 1 && mostRecent.scorecard.overallScore >= 85) {
        // Recalculate current streak from most recent going back
        currentStreak = 0;
        let consecutive = true;
        let checkDate = today;
        
        for (const exec of executions) {
          const execDate = startOfDay(exec.executionDate);
          const diff = differenceInDays(checkDate, execDate);
          
          if (diff <= 1 && exec.scorecard.overallScore >= 85) {
            currentStreak++;
            checkDate = execDate;
          } else {
            break;
          }
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate habit-specific streak
   */
  async calculateHabitStreak(
    userId: string,
    habitId: string
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: Date | null;
  }> {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 365);

    const executions = await DailyExecution.find({
      userId: new Types.ObjectId(userId),
      executionDate: { $gte: startDate, $lte: today },
      'habitExecutions.habitId': new Types.ObjectId(habitId),
    }).sort({ executionDate: -1 });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    let lastCompletedDate: Date | null = null;

    for (const exec of executions) {
      const habitExec = exec.habitExecutions.find(
        h => h.habitId.toString() === habitId
      );

      if (!habitExec) continue;

      const execDate = startOfDay(exec.executionDate);

      if (habitExec.isCompleted) {
        if (!lastCompletedDate) {
          lastCompletedDate = exec.executionDate;
        }

        if (lastDate === null) {
          tempStreak = 1;
        } else {
          const daysDiff = differenceInDays(lastDate, execDate);
          if (daysDiff === 1) {
            tempStreak++;
          } else if (daysDiff > 1) {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            tempStreak = 1;
          }
        }
        lastDate = execDate;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
        lastDate = null;
      }
    }

    // Calculate current streak
    if (executions.length > 0) {
      currentStreak = 0;
      let checkDate = today;

      for (const exec of executions) {
        const habitExec = exec.habitExecutions.find(
          h => h.habitId.toString() === habitId
        );
        if (!habitExec) continue;

        const execDate = startOfDay(exec.executionDate);
        const diff = differenceInDays(checkDate, execDate);

        if (diff <= 1 && habitExec.isCompleted) {
          currentStreak++;
          checkDate = execDate;
        } else {
          break;
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak, lastCompletedDate };
  }

  /**
   * Update user statistics with current streak data
   */
  async updateUserStreakStats(userId: string): Promise<void> {
    const { currentStreak, longestStreak } = await this.calculateUserStreak(userId);

    const user = await User.findById(userId);
    if (user) {
      user.statistics.currentStreak = currentStreak;
      if (longestStreak > user.statistics.longestStreak) {
        user.statistics.longestStreak = longestStreak;
      }
      await user.save();
    }
  }

  /**
   * Update habit streak data
   */
  async updateHabitStreakData(userId: string, habitId: string): Promise<void> {
    const { currentStreak, longestStreak, lastCompletedDate } = 
      await this.calculateHabitStreak(userId, habitId);

    const habit = await Habit.findOne({
      _id: new Types.ObjectId(habitId),
      userId: new Types.ObjectId(userId),
    });

    if (habit) {
      habit.streakData.currentStreak = currentStreak;
      if (longestStreak > habit.streakData.longestStreak) {
        habit.streakData.longestStreak = longestStreak;
      }
      if (lastCompletedDate) {
        habit.streakData.lastCompletedDate = lastCompletedDate;
      }
      await habit.save();
    }
  }

  /**
   * Check if streak is at risk (not completed today)
   */
  async isStreakAtRisk(userId: string): Promise<boolean> {
    const today = startOfDay(new Date());
    
    const todayExec = await DailyExecution.findOne({
      userId: new Types.ObjectId(userId),
      executionDate: { $gte: today },
    });

    if (!todayExec) return true;
    
    return todayExec.scorecard.overallScore < 85;
  }

  /**
   * Get streak milestones
   */
  getStreakMilestone(streak: number): {
    isMilestone: boolean;
    milestone: number;
    nextMilestone: number;
    message: string;
  } {
    const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
    
    const isMilestone = milestones.includes(streak);
    const currentMilestone = milestones.filter(m => m <= streak).pop() || 0;
    const nextMilestone = milestones.find(m => m > streak) || streak + 50;

    let message = '';
    if (isMilestone) {
      if (streak === 7) message = '🔥 One week streak! Great start!';
      else if (streak === 14) message = '🎯 Two weeks strong!';
      else if (streak === 21) message = '💪 Three weeks! Habit forming!';
      else if (streak === 30) message = '🏆 30 days! You\'re unstoppable!';
      else if (streak === 50) message = '⭐ 50 days! Remarkable consistency!';
      else if (streak === 75) message = '🌟 75 days! You\'re a legend!';
      else if (streak === 100) message = '💯 100 days! Incredible achievement!';
      else if (streak >= 150) message = '👑 Master level streak!';
    }

    return {
      isMilestone,
      milestone: currentMilestone,
      nextMilestone,
      message,
    };
  }
}

export const streakService = new StreakService();

