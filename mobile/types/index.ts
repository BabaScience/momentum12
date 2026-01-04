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

export enum HabitTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

// User Types
export interface User {
  _id: string;
  email: string;
  displayName: string;
  profile: {
    avatarUrl?: string;
    timezone: string;
    weekStartDay: 'monday' | 'sunday';
    preferredUnits: 'metric' | 'imperial';
  };
  preferences: {
    notifications: {
      dailyReminder: boolean;
      weeklyReview: boolean;
      streakMilestones: boolean;
      reminderTime: string;
    };
    theme: Theme;
    hapticFeedback: boolean;
  };
  statistics: {
    currentStreak: number;
    longestStreak: number;
    totalHabitsCompleted: number;
    totalPlansCreated: number;
    averageWeeklyScore: number;
  };
  createdAt: string;
  lastActiveAt: string;
}

// Habit Types
export interface Habit {
  _id: string;
  userId: string;
  planId?: string;
  name: string;
  description?: string;
  frequency: {
    type: FrequencyType;
    daysOfWeek?: number[];
    timesPerWeek?: number;
  };
  reminders: {
    enabled: boolean;
    times: string[];
    sound: string;
  };
  appearance: {
    iconName: string;
    colorHex: string;
    emoji?: string;
  };
  streakData: {
    currentStreak: number;
    longestStreak: number;
    targetStreak: number;
    lastCompletedDate?: string;
  };
  statistics: {
    totalCompletions: number;
    averageTimeSpent: number;
    completionRate: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Plan Types
export interface StrategicGoal {
  _id: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: number;
  measurement: {
    targetValue: number;
    currentValue: number;
    unit: string;
  };
  isAchieved: boolean;
  achievedAt?: string;
}

export interface WeeklyGoal {
  _id: string;
  strategicGoalId: string;
  weekNumber: number;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TwelveWeekPlan {
  _id: string;
  userId: string;
  title: string;
  visionStatement: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  currentWeek: number;
  strategicGoals: StrategicGoal[];
  weeklyGoals: WeeklyGoal[];
  executionMetrics: {
    overallScore: number;
    weeklyScores: number[];
    habitCompletionRate: number;
    goalCompletionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Execution Types
export interface HabitExecution {
  habitId: string;
  isCompleted: boolean;
  completedAt?: string;
  timeSpentMinutes?: number;
  intensityRating?: number;
  notes?: string;
}

export interface DailyAction {
  _id: string;
  weeklyGoalId: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface DailyExecution {
  _id: string;
  userId: string;
  planId: string;
  executionDate: string;
  habitExecutions: HabitExecution[];
  dailyActions: DailyAction[];
  scorecard: {
    habitsScore: number;
    actionsScore: number;
    overallScore: number;
  };
  reflection?: {
    wins: string;
    challenges: string;
    learnings: string;
    gratitude?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface DashboardData {
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
  weeklyTrend: {
    weekNumber: number;
    score: number;
    habitsCompleted: number;
    goalsCompleted: number;
  }[];
  habitPerformance: {
    habitId: string;
    habitName: string;
    completionRate: number;
    currentStreak: number;
    trend: HabitTrend;
  }[];
  goalProgress: {
    goalId: string;
    title: string;
    category: GoalCategory;
    progressPercentage: number;
    isOnTrack: boolean;
  }[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

