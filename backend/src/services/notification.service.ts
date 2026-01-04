import { Types } from 'mongoose';
import { User, TwelveWeekPlan, DailyExecution } from '../models/index.js';
import { format, startOfDay, subDays } from 'date-fns';

/**
 * Notification Types
 */
export enum NotificationType {
  DAILY_REMINDER = 'daily_reminder',
  EVENING_REVIEW = 'evening_review',
  WEEKLY_REVIEW = 'weekly_review',
  STREAK_MILESTONE = 'streak_milestone',
  STREAK_AT_RISK = 'streak_at_risk',
  GOAL_COMPLETED = 'goal_completed',
  LOW_SCORE_ALERT = 'low_score_alert',
  PLAN_ENDING_SOON = 'plan_ending_soon',
}

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Notification Service
 * Handles push notification generation and scheduling
 */
export class NotificationService {
  /**
   * Generate daily reminder notification
   */
  async generateDailyReminder(userId: string): Promise<NotificationPayload | null> {
    const user = await User.findById(userId);
    if (!user || !user.preferences.notifications.dailyReminder) {
      return null;
    }

    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    
    let body = 'Time to check in on your habits!';
    if (plan) {
      body = `Week ${plan.currentWeek} of 12: Time to execute on your goals!`;
    }

    return {
      type: NotificationType.DAILY_REMINDER,
      userId,
      title: '🌅 Good Morning!',
      body,
      data: { planId: plan?._id?.toString() },
    };
  }

  /**
   * Generate evening review notification
   */
  async generateEveningReview(userId: string): Promise<NotificationPayload | null> {
    const user = await User.findById(userId);
    if (!user || !user.preferences.notifications.dailyReminder) {
      return null;
    }

    const today = startOfDay(new Date());
    const execution = await DailyExecution.findByUserAndDate(
      new Types.ObjectId(userId),
      today
    );

    let body = 'Complete your daily reflection before bed.';
    if (execution) {
      const completedHabits = execution.habitExecutions.filter(h => h.isCompleted).length;
      const totalHabits = execution.habitExecutions.length;
      body = `You completed ${completedHabits}/${totalHabits} habits today. Add your reflection!`;
    }

    return {
      type: NotificationType.EVENING_REVIEW,
      userId,
      title: '🌙 Daily Review',
      body,
      data: { executionId: execution?._id?.toString() },
    };
  }

  /**
   * Generate weekly review notification
   */
  async generateWeeklyReview(userId: string): Promise<NotificationPayload | null> {
    const user = await User.findById(userId);
    if (!user || !user.preferences.notifications.weeklyReview) {
      return null;
    }

    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    if (!plan) {
      return null;
    }

    return {
      type: NotificationType.WEEKLY_REVIEW,
      userId,
      title: '📊 Weekly Review Time',
      body: `Week ${plan.currentWeek} is complete. Review your progress and plan for next week!`,
      data: { 
        planId: plan._id.toString(),
        weekNumber: plan.currentWeek,
      },
    };
  }

  /**
   * Generate streak milestone notification
   */
  async generateStreakMilestone(userId: string, streak: number): Promise<NotificationPayload | null> {
    const user = await User.findById(userId);
    if (!user || !user.preferences.notifications.streakMilestones) {
      return null;
    }

    const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
    if (!milestones.includes(streak)) {
      return null;
    }

    let emoji = '🔥';
    if (streak >= 30) emoji = '🏆';
    if (streak >= 100) emoji = '💯';
    if (streak >= 365) emoji = '👑';

    return {
      type: NotificationType.STREAK_MILESTONE,
      userId,
      title: `${emoji} ${streak} Day Streak!`,
      body: `Incredible! You've maintained your streak for ${streak} days!`,
      data: { streak },
    };
  }

  /**
   * Generate streak at risk notification
   */
  async generateStreakAtRisk(userId: string): Promise<NotificationPayload | null> {
    const user = await User.findById(userId);
    if (!user || user.statistics.currentStreak === 0) {
      return null;
    }

    const today = startOfDay(new Date());
    const execution = await DailyExecution.findByUserAndDate(
      new Types.ObjectId(userId),
      today
    );

    // If already completed enough for today, no need to alert
    if (execution && execution.scorecard.overallScore >= 85) {
      return null;
    }

    return {
      type: NotificationType.STREAK_AT_RISK,
      userId,
      title: '⚠️ Streak at Risk!',
      body: `Your ${user.statistics.currentStreak}-day streak is at risk! Complete your habits to keep it alive.`,
      data: { currentStreak: user.statistics.currentStreak },
    };
  }

  /**
   * Generate low score alert notification
   */
  async generateLowScoreAlert(
    userId: string,
    weekNumber: number,
    score: number
  ): Promise<NotificationPayload | null> {
    if (score >= 70) {
      return null;
    }

    return {
      type: NotificationType.LOW_SCORE_ALERT,
      userId,
      title: '📉 Execution Score Alert',
      body: `Your Week ${weekNumber} score is ${score}%. Let's get back on track!`,
      data: { weekNumber, score },
    };
  }

  /**
   * Generate goal completed notification
   */
  generateGoalCompleted(
    userId: string,
    goalTitle: string
  ): NotificationPayload {
    return {
      type: NotificationType.GOAL_COMPLETED,
      userId,
      title: '🎉 Goal Achieved!',
      body: `Congratulations! You completed: ${goalTitle}`,
      data: { goalTitle },
    };
  }

  /**
   * Generate plan ending soon notification
   */
  async generatePlanEndingSoon(
    userId: string,
    daysRemaining: number
  ): Promise<NotificationPayload | null> {
    const plan = await TwelveWeekPlan.findActivePlanByUser(new Types.ObjectId(userId));
    if (!plan) {
      return null;
    }

    if (daysRemaining > 7) {
      return null;
    }

    return {
      type: NotificationType.PLAN_ENDING_SOON,
      userId,
      title: '⏰ 12 Week Plan Ending Soon',
      body: `Only ${daysRemaining} days left! Make every day count.`,
      data: { 
        planId: plan._id.toString(),
        daysRemaining,
      },
    };
  }

  /**
   * Get users to notify at a specific time
   */
  async getUsersForDailyReminder(time: string): Promise<string[]> {
    const users = await User.find({
      'preferences.notifications.dailyReminder': true,
      'preferences.notifications.reminderTime': time,
    });

    return users.map(u => u._id.toString());
  }

  /**
   * Format notification for FCM
   */
  formatForFCM(notification: NotificationPayload): {
    notification: { title: string; body: string };
    data: Record<string, string>;
  } {
    return {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: notification.type,
        ...Object.fromEntries(
          Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
    };
  }

  /**
   * Send push notification (placeholder - would integrate with FCM)
   */
  async sendPushNotification(
    userId: string,
    notification: NotificationPayload
  ): Promise<void> {
    // In production, this would:
    // 1. Get user's FCM token from database
    // 2. Format notification for FCM
    // 3. Send via Firebase Admin SDK
    
    console.log(`[NOTIFICATION] Sending to ${userId}:`, notification.title);
    
    // Placeholder for actual FCM integration:
    // const fcmPayload = this.formatForFCM(notification);
    // await admin.messaging().send({
    //   token: userFcmToken,
    //   ...fcmPayload,
    // });
  }
}

export const notificationService = new NotificationService();

