import { Request } from 'express';
import { Types } from 'mongoose';

// Enums
export enum GoalCategory {
  HEALTH = 'health',
  CAREER = 'career',
  RELATIONSHIPS = 'relationships',
  FINANCE = 'finance',
  PERSONAL = 'personal',
  LEARNING = 'learning',
}

export enum PlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum FrequencyType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum WeekStartDay {
  MONDAY = 'monday',
  SUNDAY = 'sunday',
}

export enum PreferredUnits {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

export enum HabitTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

// User Types
export interface IUserProfile {
  avatarUrl?: string;
  timezone: string;
  weekStartDay: WeekStartDay;
  preferredUnits: PreferredUnits;
}

export interface INotificationPreferences {
  dailyReminder: boolean;
  weeklyReview: boolean;
  streakMilestones: boolean;
  reminderTime: string; // HH:mm format
}

export interface IUserPreferences {
  notifications: INotificationPreferences;
  theme: Theme;
  hapticFeedback: boolean;
}

export interface IUserStatistics {
  currentStreak: number;
  longestStreak: number;
  totalHabitsCompleted: number;
  totalPlansCreated: number;
  averageWeeklyScore: number;
}

// Plan Types
export interface IMeasurement {
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface IStrategicGoal {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: GoalCategory;
  priority: number;
  measurement: IMeasurement;
  isAchieved: boolean;
  achievedAt?: Date;
}

export interface IWeeklyGoal {
  _id: Types.ObjectId;
  strategicGoalId: Types.ObjectId;
  weekNumber: number;
  description: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IExecutionMetrics {
  overallScore: number;
  weeklyScores: number[];
  habitCompletionRate: number;
  goalCompletionRate: number;
}

// Habit Types
export interface IHabitFrequency {
  type: FrequencyType;
  daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  timesPerWeek?: number;
}

export interface IHabitReminders {
  enabled: boolean;
  times: string[]; // HH:mm format
  sound: string;
}

export interface IHabitAppearance {
  iconName: string;
  colorHex: string;
  emoji?: string;
}

export interface IStreakData {
  currentStreak: number;
  longestStreak: number;
  targetStreak: number;
  lastCompletedDate?: Date;
}

export interface IHabitStatistics {
  totalCompletions: number;
  averageTimeSpent: number;
  completionRate: number;
}

// Execution Types
export interface IHabitExecution {
  habitId: Types.ObjectId;
  isCompleted: boolean;
  completedAt?: Date;
  timeSpentMinutes?: number;
  intensityRating?: number; // 1-5
  notes?: string;
}

export interface IDailyAction {
  _id: Types.ObjectId;
  weeklyGoalId: Types.ObjectId;
  description: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IScorecard {
  habitsScore: number;
  actionsScore: number;
  overallScore: number;
}

export interface IReflection {
  wins: string;
  challenges: string;
  learnings: string;
  gratitude?: string;
}

// Auth Types
export interface ITokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface IAuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// API Response Types
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics Types
export interface IWeeklyTrend {
  weekNumber: number;
  score: number;
  habitsCompleted: number;
  goalsCompleted: number;
}

export interface IHabitPerformance {
  habitId: string;
  habitName: string;
  completionRate: number;
  currentStreak: number;
  trend: HabitTrend;
}

export interface IGoalProgress {
  goalId: string;
  title: string;
  category: GoalCategory;
  progressPercentage: number;
  isOnTrack: boolean;
}

export interface IDashboardData {
  currentPlan: {
    id: string;
    title: string;
    currentWeek: number;
    daysRemaining: number;
    overallScore: number;
  } | null;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    streakHistory: { date: string; maintained: boolean }[];
  };
  weeklyTrend: IWeeklyTrend[];
  habitPerformance: IHabitPerformance[];
  goalProgress: IGoalProgress[];
}

