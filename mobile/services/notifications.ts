import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationConfig {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger?: Notifications.NotificationTriggerInput;
}

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      this.pushToken = token.data;
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(config: NotificationConfig): Promise<string> {
    const { title, body, data, trigger } = config;

    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger || null,
    });
  }

  /**
   * Schedule daily reminder notification
   */
  async scheduleDailyReminder(hour: number, minute: number): Promise<string> {
    // Cancel existing daily reminder
    await this.cancelNotificationsByTag('daily-reminder');

    return this.scheduleNotification({
      title: '🌅 Good Morning!',
      body: 'Time to check in on your habits!',
      data: { type: 'daily_reminder' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule evening review notification
   */
  async scheduleEveningReview(hour: number = 20, minute: number = 0): Promise<string> {
    await this.cancelNotificationsByTag('evening-review');

    return this.scheduleNotification({
      title: '🌙 Daily Review',
      body: 'Complete your daily reflection before bed.',
      data: { type: 'evening_review' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule weekly review notification (Sunday)
   */
  async scheduleWeeklyReview(hour: number = 18, minute: number = 0): Promise<string> {
    await this.cancelNotificationsByTag('weekly-review');

    return this.scheduleNotification({
      title: '📊 Weekly Review Time',
      body: 'Review your progress and plan for next week!',
      data: { type: 'weekly_review' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour,
        minute,
      },
    });
  }

  /**
   * Send streak milestone notification
   */
  async sendStreakMilestoneNotification(streak: number): Promise<string> {
    let emoji = '🔥';
    if (streak >= 30) emoji = '🏆';
    if (streak >= 100) emoji = '💯';

    return this.scheduleNotification({
      title: `${emoji} ${streak} Day Streak!`,
      body: `Incredible! You've maintained your streak for ${streak} days!`,
      data: { type: 'streak_milestone', streak },
    });
  }

  /**
   * Send streak at risk notification
   */
  async sendStreakAtRiskNotification(currentStreak: number): Promise<string> {
    return this.scheduleNotification({
      title: '⚠️ Streak at Risk!',
      body: `Your ${currentStreak}-day streak is at risk! Complete your habits to keep it alive.`,
      data: { type: 'streak_at_risk', streak: currentStreak },
    });
  }

  /**
   * Cancel notifications by tag/type
   */
  async cancelNotificationsByTag(tag: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduled) {
      if (notification.content.data?.type === tag) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Set up notification response listener
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Set up notification received listener
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }
}

export const notificationService = new NotificationService();

